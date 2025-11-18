export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const AUTH_TOKEN = 'valid_token';
    const DEFAULT_USERNAME = 'admin'; // 默认管理员用户名（可自定义）

    // 初始化默认账户（首次运行）
    const initDefaultAccount = async () => {
      const existingAccount = await env.NAV_LINKS.get('admin_account');
      if (!existingAccount) {
        // 首次运行自动创建账户：用户名admin，密码default123
        await env.NAV_LINKS.put('admin_account', JSON.stringify({
          username: DEFAULT_USERNAME,
          password: 'default123' // 默认密码
        }));
      }
    };
    await initDefaultAccount();


    // 1. 登录验证接口（用户名+密码）
    if (url.pathname === '/api/verify-password' && request.method === 'POST') {
      const { username, password } = await request.json();
      const account = JSON.parse(await env.NAV_LINKS.get('admin_account') || '{}');
      
      // 验证用户名和密码是否匹配
      if (username === account.username && password === account.password) {
        return new Response('验证通过', { status: 200 });
      } else {
        return new Response('用户名或密码错误', { status: 401 });
      }
    }


    // 2. 修改密码接口（验证用户名）
    if (url.pathname === '/api/change-password' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
      
      const { username, oldPassword, newPassword } = await request.json();
      const account = JSON.parse(await env.NAV_LINKS.get('admin_account') || '{}');
      
      // 验证用户名和原密码
      if (username !== account.username) {
        return new Response('用户名错误', { status: 400 });
      }
      if (oldPassword !== account.password) {
        return new Response('原密码错误', { status: 400 });
      }
      if (newPassword.length < 6) {
        return new Response('新密码长度不能小于6位', { status: 400 });
      }
      
      // 更新密码（保持用户名不变）
      await env.NAV_LINKS.put('admin_account', JSON.stringify({
        ...account,
        password: newPassword
      }));
      return new Response('密码修改成功', { status: 200 });
    }


    // 3. 公开链接接口
    if (url.pathname === '/api/links/public' && request.method === 'GET') {
      const links = [];
      const iterator = env.NAV_LINKS.list();
      for await (const key of iterator) {
        if (key.name !== 'admin_account') { // 排除账户信息
          const link = await env.NAV_LINKS.get(key.name, { type: 'json' });
          if (link.visibility === 'public') links.push(link);
        }
      }
      return new Response(JSON.stringify(links), {
        headers: { 'Content-Type': 'application/json' }
      });
    }


    // 4. 管理员API权限验证
    const isAdminApi = url.pathname === '/api/links' || url.pathname.match(/^\/api\/links\/(\w+)$/);
    if (isAdminApi && request.method !== 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
    }


    // 5. 管理员获取所有链接
    if (url.pathname === '/api/links' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('未授权', { status: 401 });
      }
      const links = [];
      const iterator = env.NAV_LINKS.list();
      for await (const key of iterator) {
        if (key.name !== 'admin_account') { // 排除账户信息
          const link = await env.NAV_LINKS.get(key.name, { type: 'json' });
          links.push(link);
        }
      }
      return new Response(JSON.stringify(links), {
        headers: { 'Content-Type': 'application/json' }
      });
    }


    // 6. 添加链接
    if (url.pathname === '/api/links' && request.method === 'POST') {
      try {
        const link = await request.json();
        if (!link.id || !link.name || !link.externalUrl || !link.category || !link.visibility) {
          return new Response('缺少必要字段', { status: 400 });
        }
        await env.NAV_LINKS.put(link.id, JSON.stringify(link));
        return new Response('添加成功', { status: 201 });
      } catch (e) {
        return new Response('请求格式错误', { status: 400 });
      }
    }


    // 7. 删除链接
    if (url.pathname.match(/^\/api\/links\/(\w+)$/) && request.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      await env.NAV_LINKS.delete(id);
      return new Response('删除成功');
    }


    // 8. 静态文件
    if (url.pathname === '/') {
      const html = await env.ASSETS.get('index.html');
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }


    // 404
    return new Response('页面不存在', { status: 404 });
  }
};
