const getToken = () => localStorage.getItem('gdf_access_token');
const setToken = (token) => localStorage.setItem('gdf_access_token', token);
const clearToken = () => localStorage.removeItem('gdf_access_token');

const jsonPost = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

const authedRequest = async (url, init = {}) => {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return null;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: 'Bearer ' + token,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
    return null;
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

const authedFetch = async (url, init = {}) => {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return null;
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: 'Bearer ' + token,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
    return null;
  }

  return res;
};

const initLoginPage = () => {
  const out = document.getElementById('out');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const btnRegister = document.getElementById('btnRegister');
  const form = document.getElementById('form');

  if (!out || !email || !password || !btnRegister || !form) return;

  if (getToken()) {
    window.location.href = '/folders';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    out.textContent = 'Entrando...';
    const r = await jsonPost('/auth/login', {
      email: email.value,
      password: password.value,
    });
    if (!r.ok) {
      out.textContent =
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha no login');
      return;
    }
    setToken(r.data.accessToken);
    window.location.href = '/folders';
  });

  btnRegister.addEventListener('click', async () => {
    out.textContent = 'Cadastrando...';
    const r = await jsonPost('/auth/register', {
      email: email.value,
      password: password.value,
    });
    if (!r.ok) {
      out.textContent =
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha no cadastro');
      return;
    }
    setToken(r.data.accessToken);
    window.location.href = '/folders';
  });
};

const initFoldersPage = () => {
  const msg = document.getElementById('msg');
  const grid = document.getElementById('grid');
  const breadcrumb = document.getElementById('breadcrumb');
  const filesGrid = document.getElementById('filesGrid');
  const folderName = document.getElementById('folderName');
  const uploadSection = document.getElementById('uploadSection');
  const fileSearch = document.getElementById('fileSearch');
  const btnOpenCreateFolder = document.getElementById('btnOpenCreateFolder');
  const createFolderModal = document.getElementById('createFolderModal');
  const btnCloseCreateFolder = document.getElementById('btnCloseCreateFolder');
  const btnCancelCreateFolder = document.getElementById(
    'btnCancelCreateFolder',
  );
  const btnCreateFolder = document.getElementById('btnCreateFolder');
  const btnOpenUpload = document.getElementById('btnOpenUpload');
  const uploadModal = document.getElementById('uploadModal');
  const btnCloseUpload = document.getElementById('btnCloseUpload');
  const btnCancelUpload = document.getElementById('btnCancelUpload');
  const deleteFileModal = document.getElementById('deleteFileModal');
  const btnCloseDeleteFile = document.getElementById('btnCloseDeleteFile');
  const btnCancelDeleteFile = document.getElementById('btnCancelDeleteFile');
  const btnConfirmDeleteFile = document.getElementById(
    'btnConfirmDeleteFile',
  );
  const deleteFileName = document.getElementById('deleteFileName');
  const filesInput = document.getElementById('files');
  const uploadList = document.getElementById('uploadList');
  const btnUpload = document.getElementById('btnUpload');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnLogout = document.getElementById('btnLogout');

  if (
    !msg ||
    !grid ||
    !breadcrumb ||
    !filesGrid ||
    !folderName ||
    !uploadSection ||
    !fileSearch ||
    !btnOpenCreateFolder ||
    !createFolderModal ||
    !btnCloseCreateFolder ||
    !btnCancelCreateFolder ||
    !btnCreateFolder ||
    !btnOpenUpload ||
    !uploadModal ||
    !btnCloseUpload ||
    !btnCancelUpload ||
    !deleteFileModal ||
    !btnCloseDeleteFile ||
    !btnCancelDeleteFile ||
    !btnConfirmDeleteFile ||
    !deleteFileName ||
    !filesInput ||
    !uploadList ||
    !btnUpload ||
    !btnRefresh ||
    !btnLogout
  ) {
    return;
  }

  const setMessage = (text) => {
    msg.textContent = text ?? '';
  };

  const folderPreviewObjectUrls = [];
  const fileThumbObjectUrls = [];

  const clearFolderPreviewObjectUrls = () => {
    for (const url of folderPreviewObjectUrls) URL.revokeObjectURL(url);
    folderPreviewObjectUrls.length = 0;
  };

  const clearFileThumbObjectUrls = () => {
    for (const url of fileThumbObjectUrls) URL.revokeObjectURL(url);
    fileThumbObjectUrls.length = 0;
  };

  const getCurrentPath = () => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('path') ?? '').trim();
  };

  const setCurrentPath = (path) => {
    const params = new URLSearchParams(window.location.search);
    if (!path) params.delete('path');
    else params.set('path', path);
    const url = window.location.pathname + '?' + params.toString();
    window.history.pushState({}, '', url);
  };

  const renderBreadcrumb = (crumbs) => {
    breadcrumb.innerHTML = '';
    for (let i = 0; i < crumbs.length; i++) {
      const c = crumbs[i];
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '>';
        breadcrumb.appendChild(sep);
      }

      const isLast = i === crumbs.length - 1;
      if (isLast) {
        const span = document.createElement('span');
        span.textContent = c.name;
        breadcrumb.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = c.name;
        btn.addEventListener('click', async () => {
          setCurrentPath(c.path);
          await load();
        });
        breadcrumb.appendChild(btn);
      }
    }
  };

  const renderGrid = (folders) => {
    clearFolderPreviewObjectUrls();
    grid.innerHTML = '';
    for (const f of folders) {
      const card = document.createElement('div');
      card.className = 'folder-card';

      const top = document.createElement('div');
      top.className = 'folder-card-top';

      const name = document.createElement('div');
      name.className = 'folder-card-name';
      name.textContent = f.name;

      const actions = document.createElement('div');
      actions.className = 'folder-card-actions';

      const btnRename = document.createElement('button');
      btnRename.type = 'button';
      btnRename.className = 'secondary';
      btnRename.textContent = 'Renomear';
      btnRename.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newName = prompt('Novo nome da pasta:', f.name);
        if (!newName) return;
        setMessage('Renomeando...');
        const r = await authedRequest('/api/folders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: f.path, newName }),
        });
        if (!r) return;
        if (!r.ok) {
          setMessage(
            'Erro (' +
              r.status +
              '): ' +
              (r.data.message ?? 'Falha ao renomear'),
          );
          return;
        }
        await load();
        setMessage('Pasta renomeada.');
      });

      actions.appendChild(btnRename);
      top.appendChild(name);
      top.appendChild(actions);

      const preview = document.createElement('div');
      preview.className = 'folder-card-preview';

      const previewGrid = document.createElement('div');
      previewGrid.className = 'folder-preview-grid';

      for (const item of f.preview ?? []) {
        const box = document.createElement('div');
        box.className = 'folder-preview-item';
        if (item.kind === 'file' && item.isImage) {
          const img = document.createElement('img');
          img.alt = item.name;
          box.appendChild(img);
          void (async () => {
            const res = await authedFetch(
              '/api/folders/file/view?path=' + encodeURIComponent(item.path),
            );
            if (!res || !res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            folderPreviewObjectUrls.push(url);
            img.src = url;
          })();
        } else {
          const ph = document.createElement('div');
          ph.className = 'folder-preview-placeholder';
          ph.textContent = item.kind === 'folder' ? 'DIR' : 'ARQ';
          box.appendChild(ph);
        }
        previewGrid.appendChild(box);
      }

      preview.appendChild(previewGrid);

      const meta = document.createElement('div');
      meta.className = 'folder-card-meta';
      meta.textContent =
        (f.counts?.folders ?? 0) +
        ' pastas, ' +
        (f.counts?.files ?? 0) +
        ' arquivos';

      card.appendChild(top);
      card.appendChild(preview);
      card.appendChild(meta);

      card.addEventListener('click', async () => {
        setCurrentPath(f.path);
        await load();
      });

      grid.appendChild(card);
    }
  };

  let pendingUploads = [];
  let searchTimer = null;
  let fileToDelete = null;

  const isModalOpen = () => uploadModal.classList.contains('open');
  const isCreateFolderModalOpen = () =>
    createFolderModal.classList.contains('open');
  const isDeleteFileModalOpen = () => deleteFileModal.classList.contains('open');

  const openUploadModal = () => {
    if (!getCurrentPath()) return;
    uploadModal.classList.add('open');
    uploadModal.setAttribute('aria-hidden', 'false');
  };

  const closeUploadModal = () => {
    uploadModal.classList.remove('open');
    uploadModal.setAttribute('aria-hidden', 'true');
  };

  const openCreateFolderModal = () => {
    createFolderModal.classList.add('open');
    createFolderModal.setAttribute('aria-hidden', 'false');
    folderName.focus();
  };

  const closeCreateFolderModal = () => {
    createFolderModal.classList.remove('open');
    createFolderModal.setAttribute('aria-hidden', 'true');
  };

  const openDeleteFileModal = (file) => {
    fileToDelete = file;
    deleteFileName.textContent = file.name ?? '';
    deleteFileModal.classList.add('open');
    deleteFileModal.setAttribute('aria-hidden', 'false');
  };

  const closeDeleteFileModal = () => {
    fileToDelete = null;
    deleteFileModal.classList.remove('open');
    deleteFileModal.setAttribute('aria-hidden', 'true');
  };

  const clearUploadSelection = () => {
    pendingUploads = [];
    filesInput.value = '';
    uploadList.innerHTML = '';
  };

  const renderFiles = async (files) => {
    clearFileThumbObjectUrls();
    filesGrid.innerHTML = '';
    for (const file of files) {
      const card = document.createElement('div');
      card.className = 'file-card';

      const thumb = document.createElement('div');
      thumb.className = 'file-thumb';

      const body = document.createElement('div');
      body.className = 'file-body';

      const name = document.createElement('div');
      name.className = 'file-name';
      name.textContent = file.name;

      const actions = document.createElement('div');
      actions.className = 'file-actions';

      const btnDownload = document.createElement('button');
      btnDownload.type = 'button';
      btnDownload.className = 'secondary';
      btnDownload.textContent = 'Download';
      btnDownload.addEventListener('click', async () => {
        setMessage('Baixando...');
        const res = await authedFetch(
          '/api/folders/file/download?path=' + encodeURIComponent(file.path),
        );
        if (!res) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(
            'Erro (' + res.status + '): ' + (data.message ?? 'Falha no download'),
          );
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        if (file.isImage) {
          const dot = file.name.lastIndexOf('.');
          a.download = (dot > 0 ? file.name.slice(0, dot) : file.name) + '.pdf';
        } else {
          a.download = file.name;
        }
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setMessage('');
      });

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'danger';
      btnDelete.textContent = 'Excluir';
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteFileModal(file);
      });

      actions.appendChild(btnDownload);
      actions.appendChild(btnDelete);
      body.appendChild(name);
      body.appendChild(actions);

      if (file.isImage) {
        const img = document.createElement('img');
        img.alt = file.name;
        thumb.appendChild(img);
        const res = await authedFetch(
          '/api/folders/file/view?path=' + encodeURIComponent(file.path),
        );
        if (res && res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          fileThumbObjectUrls.push(url);
          img.src = url;
        }
      }

      card.appendChild(thumb);
      card.appendChild(body);
      filesGrid.appendChild(card);
    }
  };

  const applyFileFilter = () => {
    const q = (fileSearch.value ?? '').trim().toLowerCase();
    const cards = filesGrid.querySelectorAll('.file-card');
    for (const card of cards) {
      const nameEl = card.querySelector('.file-name');
      const name = (nameEl?.textContent ?? '').toLowerCase();
      const visible = q === '' || name.includes(q);
      card.style.display = visible ? '' : 'none';
    }
  };

  const load = async () => {
    const currentPath = getCurrentPath();
    const q = (fileSearch.value ?? '').trim();
    uploadSection.style.display = currentPath ? '' : 'none';
    if (!currentPath) {
      clearUploadSelection();
      closeUploadModal();
    }

    if (!currentPath && q) {
      setMessage('Buscando...');
      const rs = await authedRequest(
        '/api/folders/search?query=' + encodeURIComponent(q),
      );
      if (!rs) return;
      if (!rs.ok) {
        setMessage(
          'Erro (' + rs.status + '): ' + (rs.data.message ?? 'Falha na busca'),
        );
        return;
      }

      renderBreadcrumb([{ name: 'Início', path: '' }]);
      renderGrid(rs.data.folders ?? []);
      await renderFiles(rs.data.files ?? []);
      setMessage('');
      return;
    }

    setMessage('Carregando...');
    const url =
      '/api/folders' +
      (currentPath ? '?path=' + encodeURIComponent(currentPath) : '');
    const r = await authedRequest(url);
    if (!r) return;
    if (!r.ok) {
      setMessage(
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha ao listar'),
      );
      return;
    }
    renderBreadcrumb(r.data.breadcrumbs ?? [{ name: 'Início', path: '' }]);
    renderGrid(r.data.folders ?? []);

    const rf = await authedRequest(
      '/api/folders/files' +
        (currentPath ? '?path=' + encodeURIComponent(currentPath) : ''),
    );
    if (rf && rf.ok) {
      await renderFiles(rf.data.files ?? []);
      applyFileFilter();
    } else {
      clearFileThumbObjectUrls();
      filesGrid.innerHTML = '';
    }

    setMessage('');
  };

  const renderUploadList = () => {
    uploadList.innerHTML = '';
    for (let i = 0; i < pendingUploads.length; i++) {
      const itemData = pendingUploads[i];
      const item = document.createElement('div');
      item.className = 'upload-item';
      item.dataset.uploadIndex = String(i);

      const title = document.createElement('div');
      title.className = 'upload-item-title';
      title.textContent = 'Nome do arquivo';

      const row = document.createElement('div');
      row.className = 'upload-item-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = itemData.name;
      input.addEventListener('input', () => {
        pendingUploads[i].name = input.value;
      });

      const btnRemove = document.createElement('button');
      btnRemove.type = 'button';
      btnRemove.className = 'secondary upload-remove';
      btnRemove.textContent = '×';
      btnRemove.addEventListener('click', () => {
        pendingUploads.splice(i, 1);
        renderUploadList();
      });

      item.appendChild(title);
      row.appendChild(input);
      row.appendChild(btnRemove);
      item.appendChild(row);
      uploadList.appendChild(item);
    }
  };

  const createFolder = async () => {
    const name = folderName.value.trim();
    if (!name) {
      setMessage('Informe o nome da pasta.');
      return;
    }
    setMessage('Criando pasta...');
    const parentPath = getCurrentPath();
    const r = await authedRequest('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentPath }),
    });
    if (!r) return;
    if (!r.ok) {
      setMessage(
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha ao criar'),
      );
      return;
    }
    folderName.value = '';
    closeCreateFolderModal();
    await load();
    setMessage('Pasta criada.');
  };

  btnOpenCreateFolder.addEventListener('click', () => {
    openCreateFolderModal();
  });

  btnCloseCreateFolder.addEventListener('click', () => {
    closeCreateFolderModal();
  });

  btnCancelCreateFolder.addEventListener('click', () => {
    folderName.value = '';
    closeCreateFolderModal();
  });

  btnCreateFolder.addEventListener('click', async () => {
    await createFolder();
  });

  folderName.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await createFolder();
    }
  });

  fileSearch.addEventListener('input', () => {
    const currentPath = getCurrentPath();
    if (!currentPath) {
      if (searchTimer !== null) {
        clearTimeout(searchTimer);
      }
      searchTimer = setTimeout(() => {
        void load();
      }, 250);
      return;
    }

    applyFileFilter();
  });

  filesInput.addEventListener('change', () => {
    const files = Array.from(filesInput.files ?? []);
    for (const f of files) {
      pendingUploads.push({ file: f, name: f.name });
    }
    filesInput.value = '';
    renderUploadList();
  });

  btnOpenUpload.addEventListener('click', () => {
    openUploadModal();
  });

  btnCloseUpload.addEventListener('click', () => {
    closeUploadModal();
  });

  btnCancelUpload.addEventListener('click', () => {
    clearUploadSelection();
    closeUploadModal();
  });

  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
      closeUploadModal();
    }
  });

  createFolderModal.addEventListener('click', (e) => {
    if (e.target === createFolderModal) {
      closeCreateFolderModal();
    }
  });

  btnCloseDeleteFile.addEventListener('click', () => {
    closeDeleteFileModal();
  });

  btnCancelDeleteFile.addEventListener('click', () => {
    closeDeleteFileModal();
  });

  btnConfirmDeleteFile.addEventListener('click', async () => {
    if (!fileToDelete) return;
    setMessage('Excluindo...');
    const r = await authedRequest(
      '/api/folders/file?path=' + encodeURIComponent(fileToDelete.path),
      { method: 'DELETE' },
    );
    if (!r) return;
    if (!r.ok) {
      setMessage(
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha ao excluir'),
      );
      return;
    }
    closeDeleteFileModal();
    await load();
    setMessage('Imagem excluída.');
  });

  deleteFileModal.addEventListener('click', (e) => {
    if (e.target === deleteFileModal) {
      closeDeleteFileModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen()) {
      closeUploadModal();
    }
    if (e.key === 'Escape' && isCreateFolderModalOpen()) {
      closeCreateFolderModal();
    }
    if (e.key === 'Escape' && isDeleteFileModalOpen()) {
      closeDeleteFileModal();
    }
  });

  btnUpload.addEventListener('click', async () => {
    if (pendingUploads.length === 0) {
      setMessage('Selecione uma ou mais imagens.');
      return;
    }

    setMessage('Enviando...');
    const form = new FormData();
    const currentPath = getCurrentPath();
    if (currentPath) form.append('path', currentPath);

    for (const item of pendingUploads) {
      const f = item.file;
      form.append('files', f, f.name);
      form.append('names', (item.name ?? '').trim() || f.name);
    }

    const r = await authedRequest('/api/folders/upload', {
      method: 'POST',
      body: form,
    });
    if (!r) return;
    if (!r.ok) {
      setMessage(
        'Erro (' + r.status + '): ' + (r.data.message ?? 'Falha ao enviar'),
      );
      return;
    }

    clearUploadSelection();
    closeUploadModal();
    await load();
    setMessage('Upload concluído.');
  });

  btnRefresh.addEventListener('click', load);

  btnLogout.addEventListener('click', () => {
    clearToken();
    window.location.href = '/';
  });

  if (!getToken()) {
    window.location.href = '/';
  } else {
    void load();
  }

  window.addEventListener('popstate', () => {
    void load();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body?.dataset?.page;
  if (page === 'login') initLoginPage();
  if (page === 'folders') initFoldersPage();
});
