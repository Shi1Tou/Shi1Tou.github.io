// 从Cloudflare环境变量读取密码（无需硬编码）
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ACCESS_PASSWORD = env.ACCESS_PASSWORD; // 关键：读取环境变量
    const AUTH_TOKEN = 'valid_token'; // 与前端同步的验证标识

    // 1. 密码验证接口（供前端登录）
    if (url.pathname === '/api/verify-password' && request.method === 'POST') {
      if (!ACCESS_PASSWORD) {
        return new Response('未配置密码', { status: 500 });
      }
      const { password } = await request.json();
      if (password === ACCESS_PASSWORD) {
        return new Response('验证通过', { status: 200 });
      } else {
        return new Response('密码错误', { status: 401 });
      }
    }

    // 2. API接口权限验证（除了登录接口）
    const isApiRequest = url.pathname.startsWith('/api');
    if (isApiRequest && url.pathname !== '/api/verify-password') {
      const authHeader = request.headers.get('Authorization');
      // 验证格式：Bearer 标识
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
    }

    // 3. 静态文件：返回index.html
    if (url.pathname === '/') {
      const html = await env.ASSETS.get('index.html');
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 4. API：获取所有链接
    if (url.pathname === '/api/links' && request.method === 'GET') {
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

    // 5. API：添加链接
    if (url.pathname === '/api/links' && request.method === 'POST') {
      try {
        const link = await request.json();
        if (!link.id || !link.name || !link.url || !link.category) {
          return new Response('缺少必要字段', { status: 400 });
        }
        await env.NAV_LINKS.put(link.id, JSON.stringify(link));
        return new Response('添加成功', { status: 201 });
      } catch (e) {
        return new Response('请求格式错误', { status: 400 });
      }
    }

    // 6. API：删除链接
    if (url.pathname.match(/^\/api\/links\/(\w+)$/) && request.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      await env.NAV_LINKS.delete(id);
      return new Response('删除成功');
    }

    // 7. 404页面
    return new Response('页面不存在', { status: 404 });
  }
};