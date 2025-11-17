// 替换为你的访问密码（需与前端一致）
const ACCESS_PASSWORD = '123456';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API接口权限验证
    const isApiRequest = url.pathname.startsWith('/api');
    if (isApiRequest) {
      const authHeader = request.headers.get('Authorization');
      // 验证格式：Bearer 密码
      if (!authHeader || authHeader !== `Bearer ${ACCESS_PASSWORD}`) {
        return new Response('未授权', { status: 401 });
      }
    }

    // 静态文件：返回index.html
    if (url.pathname === '/') {
      const html = await env.ASSETS.get('index.html');
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // API：获取所有链接
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

    // API：添加链接
    if (url.pathname === '/api/links' && request.method === 'POST') {
      try {
        const link = await request.json();
        // 验证必要字段
        if (!link.id || !link.name || !link.url || !link.category) {
          return new Response('缺少必要字段', { status: 400 });
        }
        await env.NAV_LINKS.put(link.id, JSON.stringify(link));
        return new Response('添加成功', { status: 201 });
      } catch (e) {
        return new Response('请求格式错误', { status: 400 });
      }
    }

    // API：删除链接
    if (url.pathname.match(/^\/api\/links\/(\w+)$/) && request.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      await env.NAV_LINKS.delete(id);
      return new Response('删除成功');
    }

    // 404页面
    return new Response('页面不存在', { status: 404 });
  }
};