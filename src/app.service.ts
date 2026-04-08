import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getLoginPageHtml(): string {
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GDF - Login</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #0b1220; color: #e5e7eb; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: 100%; max-width: 420px; background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { margin: 0 0 16px; color: #9ca3af; font-size: 13px; }
      label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
      input { width: 100%; box-sizing: border-box; border: 1px solid #374151; background: #0b1220; color: #e5e7eb; border-radius: 10px; padding: 10px 12px; outline: none; }
      input:focus { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(96,165,250,.15); }
      .row { display: grid; gap: 12px; margin-bottom: 14px; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      button { border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 600; }
      button.primary { background: #2563eb; color: white; }
      button.secondary { background: #111827; color: #e5e7eb; border: 1px solid #374151; }
      .meta { margin-top: 14px; display: grid; gap: 10px; }
      .box { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; background: #0b1220; border: 1px solid #1f2937; padding: 10px; border-radius: 10px; white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>GDF</h1>
        <p>Gerenciador de Fotos (Capas de Cadernos) - Login</p>

        <form id="form">
          <div class="row">
            <div>
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" required />
            </div>
            <div>
              <label for="password">Senha</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required minlength="8" />
            </div>
          </div>
          <div class="actions">
            <button class="primary" type="submit">Entrar</button>
            <button class="secondary" type="button" id="btnRegister">Cadastrar</button>
          </div>
        </form>

        <div class="meta">
          <div class="box" id="out">Digite seu email e senha.</div>
        </div>
      </div>
    </div>

    <script>
      const out = document.getElementById('out');
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      const btnRegister = document.getElementById('btnRegister');

      const setToken = (token) => localStorage.setItem('gdf_access_token', token);

      const json = async (url, body) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      };

      document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        out.textContent = 'Entrando...';
        const r = await json('/auth/login', { email: email.value, password: password.value });
        if (!r.ok) {
          out.textContent = 'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha no login');
          return;
        }
        setToken(r.data.accessToken);
        out.textContent = 'Login efetuado com sucesso.';
      });

      btnRegister.addEventListener('click', async () => {
        out.textContent = 'Cadastrando...';
        const r = await json('/auth/register', { email: email.value, password: password.value });
        if (!r.ok) {
          out.textContent = 'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha no cadastro');
          return;
        }
        setToken(r.data.accessToken);
        out.textContent = 'Cadastro realizado com sucesso.';
      });
    </script>
  </body>
</html>`;
  }
}
