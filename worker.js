export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ACCESS_PASSWORD = env.ACCESS_PASSWORD;
    const AUTH_TOKEN = 'valid_token';

    // 1. 密码验证接口
    if (url.pathname === '/api/verify-password' && request.method === 'POST') {
      if (!ACCESS_PASSWORD) {
        return new Response('未配置密码', { status: 500 });
      }
      const { password } = await request.json();
      return password === ACCESS_PASSWORD 
        ? new Response('验证通过', { status: 200 })
        : new Response('密码错误', { status: 401 });
    }

    // 2. 公开链接接口（仅返回公开的外网链接）
    if (url.pathname === '/api/links/public' && request.method === 'GET') {
      const links = [];
      const iterator = env.NAV_LINKS.list();
      for await (const key of iterator) {
        const link = await env.NAV_LINKS.get(key.name, { type: 'json' });
        if (link.visibility === 'public') {
          links.push(link);
        }
      }
      return new Response(JSON.stringify(links), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 管理员API权限验证
    const isAdminApi = url.pathname === '/api/links' || url.pathname.match(/^\/api\/links\/(\w+)$/);
    if (isAdminApi && request.method !== 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
    }

    // 4. 管理员获取所有链接
    if (url.pathname === '/api/links' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
      const links = [];
      const iterator = env.NAV_LINKS.list();
      for await (const key of iterator) {
        const link = await env.NAV_LINKS.get(key.name, { type: 'json' });
        links.push(link);
      }
      return new Response(JSON.stringify(links), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. 添加链接（外网必填，内网可选）
    if (url.pathname === '/api/links' && request.method === 'POST') {
      try {
        const link = await request.json();
        // 验证：仅外网链接为必填，其他可选字段允许为空
        if (!link.id || !link.name || !link.externalUrl || !link.category || !link.visibility) {
          return new Response('缺少必要字段（名称、外网链接、分类、可见性为必填）', { status: 400 });
        }
        await env.NAV_LINKS.put(link.id, JSON.stringify(link));
        return new Response('添加成功', { status: 201 });
      } catch (e) {
        return new Response('请求格式错误', { status: 400 });
      }
    }

    // 6. 删除链接
    if (url.pathname.match(/^\/api\/links\/(\w+)$/) && request.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      await env.NAV_LINKS.delete(id);
      return new Response('删除成功');
    }

    // 7. 静态文件
    if (url.pathname === '/') {
      const html = await env.ASSETS.get('index.html');
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 8. 404
    return new Response('页面不存在', { status: 404 });
  }
};