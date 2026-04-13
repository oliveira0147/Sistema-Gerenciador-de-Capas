"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
let AppService = class AppService {
    getLoginPageHtml() {
        return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GDF - Login</title>
    <link rel="stylesheet" href="/styles.css" />
    <script src="/scripts.js" defer></script>
  </head>
  <body data-page="login">
    <div class="wrap-center">
      <div class="card narrow">
        <h1>GDF</h1>
        <p>Gerenciador de Fotos (Capas de Cadernos) - Login</p>

        <form id="form">
          <div class="grid">
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
  </body>
</html>`;
    }
    getFoldersPageHtml() {
        return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GDF - Pastas</title>
    <link rel="stylesheet" href="/styles.css" />
    <script src="/scripts.js" defer></script>
  </head>
  <body data-page="folders">
    <div class="wrap">
      <div class="top">
        <h1>GDF - Gerenciar Pastas</h1>
        <button class="secondary" id="btnLogout" type="button">Sair</button>
      </div>

      <div class="card">
        <div class="breadcrumb" id="breadcrumb"></div>
        <div class="row">
          <button class="primary icon-btn" id="btnOpenCreateFolder" type="button" title="Nova pasta" aria-label="Nova pasta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6.5C3 5.12 4.12 4 5.5 4H10l2 2h6.5C19.88 6 21 7.12 21 8.5v9C21 18.88 19.88 20 18.5 20h-13C4.12 20 3 18.88 3 17.5v-11Z" stroke="currentColor" stroke-width="1.8" />
              <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
          <div id="uploadSection">
            <button class="primary icon-btn" id="btnOpenUpload" type="button" title="Subir imagens" aria-label="Subir imagens">↑</button>
          </div>
          <div class="spacer"></div>
          <div class="search">
            <input id="fileSearch" type="text" placeholder="Buscar arquivos..." />
          </div>
          <button class="secondary" id="btnRefresh" type="button">Atualizar</button>
        </div>

        <div class="meta">
          <div class="box" id="msg"></div>
          <div class="folder-grid" id="grid"></div>
          <div class="files-title">Arquivos</div>
          <div class="file-grid" id="filesGrid"></div>
        </div>
      </div>
    </div>

    <div class="modal-backdrop" id="uploadModal" aria-hidden="true">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="uploadTitle">
        <div class="modal-top">
          <div class="modal-title" id="uploadTitle">Subir imagens</div>
          <button class="secondary modal-close" id="btnCloseUpload" type="button" aria-label="Fechar">×</button>
        </div>

        <div class="modal-body">
          <input id="files" type="file" multiple accept="image/*" />
          <div class="upload-list" id="uploadList"></div>
        </div>

        <div class="modal-actions">
          <button class="secondary" id="btnCancelUpload" type="button">Cancelar</button>
          <button class="primary" id="btnUpload" type="button">Enviar</button>
        </div>
      </div>
    </div>

    <div class="modal-backdrop" id="createFolderModal" aria-hidden="true">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="createFolderTitle">
        <div class="modal-top">
          <div class="modal-title" id="createFolderTitle">Criar pasta</div>
          <button class="secondary modal-close" id="btnCloseCreateFolder" type="button" aria-label="Fechar">×</button>
        </div>

        <div class="modal-body">
          <label for="folderName">Nome da pasta</label>
          <input id="folderName" type="text" placeholder="Ex: 2026 - Abril" />
        </div>

        <div class="modal-actions">
          <button class="secondary" id="btnCancelCreateFolder" type="button">Cancelar</button>
          <button class="primary" id="btnCreateFolder" type="button">Criar</button>
        </div>
      </div>
    </div>

    <div class="modal-backdrop" id="deleteFileModal" aria-hidden="true">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="deleteFileTitle">
        <div class="modal-top">
          <div class="modal-title" id="deleteFileTitle">Excluir imagem</div>
          <button class="secondary modal-close" id="btnCloseDeleteFile" type="button" aria-label="Fechar">×</button>
        </div>

        <div class="modal-body">
          <div class="warning-text">Tem certeza que deseja excluir esta imagem?</div>
          <div class="box" id="deleteFileName"></div>
        </div>

        <div class="modal-actions">
          <button class="secondary" id="btnCancelDeleteFile" type="button">Abortar</button>
          <button class="danger" id="btnConfirmDeleteFile" type="button">Excluir</button>
        </div>
      </div>
    </div>
  </body>
</html>`;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map