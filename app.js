const DATA_FILES = [
  'data/data_tthc_combined.json',
  'data_tthc_combined.json',
];

function createCategoryButton(category, index) {
  const anchor = document.createElement('a');
  anchor.className = 'category-button';
  anchor.href = `#${category.ID}`;
  anchor.dataset.category = category.ID;
  anchor.textContent = `${index}. ${category.NAME}`;
  return anchor;
}

function createProcedureRow(index, procedure) {
  const row = document.createElement('tr');
  row.dataset.search = `${procedure.PROCEDURE_NAME} ${procedure.PROCEDURE_CODE}`.toLowerCase();

  const indexCell = document.createElement('td');
  indexCell.textContent = index;

  const nameCell = document.createElement('td');
  nameCell.textContent = procedure.PROCEDURE_NAME;

  const qrCell = document.createElement('td');
  qrCell.className = 'qr-cell';
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  canvas.dataset.link = procedure.PAGE_LINK;
  canvas.setAttribute('aria-label', `QR code for ${procedure.PROCEDURE_NAME}`);
  qrCell.appendChild(canvas);

  const linkCell = document.createElement('td');
  const link = document.createElement('a');
  link.className = 'link-button';
  link.href = procedure.PAGE_LINK;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Mở link';
  linkCell.appendChild(link);

  row.append(indexCell, nameCell, qrCell, linkCell);
  return row;
}

function renderQrCode(canvas, url) {
  if (!url) {
    return;
  }

  if (typeof window.QRious !== 'function') {
    canvas.replaceWith(document.createTextNode('QR unavailable'));
    return;
  }

  new window.QRious({
    element: canvas,
    value: url,
    size: 96,
    level: 'M',
    background: 'white',
    foreground: 'black',
  });
}

function renderQrCodes() {
  document.querySelectorAll('.qr-cell canvas').forEach((canvas) => {
    try {
      renderQrCode(canvas, canvas.dataset.link);
    } catch (error) {
      console.warn('QR generation failed', error);
    }
  });
}

function updateCount() {
  const rows = Array.from(document.querySelectorAll('#contentArea .category-section'))
    .filter((section) => section.style.display !== 'none')
    .flatMap((section) => Array.from(section.querySelectorAll('tbody tr')));
  const visible = rows.filter((row) => row.style.display !== 'none');
  document.getElementById('visibleCount').textContent = `Hiển thị ${visible.length} thủ tục`;
}

function applySearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  document.querySelectorAll('#contentArea .category-section').forEach((section) => {
    let visibleCount = 0;
    section.querySelectorAll('tbody tr').forEach((row) => {
      const text = row.dataset.search || '';
      const matches = !query || text.includes(query);
      row.style.display = matches ? '' : 'none';
      if (matches) {
        visibleCount += 1;
      }
    });
    section.style.display = visibleCount > 0 ? '' : 'none';
  });
  updateCount();
}

function applyCategoryFilter() {
  const query = document.getElementById('categoryFilter').value.trim().toLowerCase();
  document.querySelectorAll('#categoryMenu .category-button').forEach((button) => {
    const label = button.textContent.toLowerCase();
    button.style.display = !query || label.includes(query) ? '' : 'none';
  });
}

function renderCategorySections(categories, procedures) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '';

  const visibleCategories = categories.filter((category) =>
    procedures.some((procedure) => procedure.CATEGORY === category.ID)
  );

  visibleCategories.forEach((category, categoryIndex) => {
    const categoryProcedures = procedures.filter((procedure) => procedure.CATEGORY === category.ID);
    if (categoryProcedures.length === 0) {
      return;
    }

    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = category.ID;

    const heading = document.createElement('h2');
    heading.textContent = `${categoryIndex + 1}. ${category.NAME}`;

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên thủ tục</th>
          <th>QR</th>
          <th>Link</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    categoryProcedures.forEach((procedure, index) => {
      tbody.appendChild(createProcedureRow(index + 1, procedure));
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    section.append(heading, tableWrapper);
    contentArea.appendChild(section);
  });

  renderQrCodes();
  updateCount();
}

function loadFirstAvailableData() {
  const errors = [];

  const tryNext = (index) => {
    if (index >= DATA_FILES.length) {
      throw new Error(errors.join(' | '));
    }

    const path = DATA_FILES[index];
    return fetch(path)
      .then((response) => {
        if (!response.ok) {
          errors.push(`${path}: ${response.status} ${response.statusText}`);
          return tryNext(index + 1);
        }
        return response.json();
      })
      .catch((error) => {
        errors.push(`${path}: ${error.message}`);
        return tryNext(index + 1);
      });
  };

  return tryNext(0);
}

function loadData() {
  loadFirstAvailableData()
    .then((data) => {
      const categories = data.CATEGORIES || data.categories || [];
      const procedures = data.PROCEDURES || data.procedures || [];
      const visibleCategories = categories.filter((category) =>
        procedures.some((procedure) => procedure.CATEGORY === category.ID)
      );

      const categoryMenu = document.getElementById('categoryMenu');
      categoryMenu.innerHTML = '';
      visibleCategories.forEach((category, index) => {
        categoryMenu.appendChild(createCategoryButton(category, index + 1));
      });

      renderCategorySections(visibleCategories, procedures);

      document.getElementById('searchInput').addEventListener('input', applySearch);
      document.getElementById('categoryFilter').addEventListener('input', applyCategoryFilter);
      categoryMenu.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('category-button')) {
          return;
        }

        event.preventDefault();
        const anchor = target.getAttribute('href');
        if (!anchor) {
          return;
        }

        const section = document.querySelector(anchor);
        if (section) {
          const top = section.getBoundingClientRect().top + window.scrollY - 20;
          window.scrollTo({ top, behavior: 'smooth' });
          document.getElementById('sidePanel').classList.remove('open');
        }
      });

      applyCategoryFilter();
    })
    .catch((error) => {
      const contentArea = document.getElementById('contentArea');
      contentArea.innerHTML = `<p class="error-message">Lỗi khi tải dữ liệu: ${error.message}</p>`;
    });
}

function setupMenuToggle() {
  const sidePanel = document.getElementById('sidePanel');
  const menuToggle = document.getElementById('menuToggle');

  menuToggle.addEventListener('click', () => {
    sidePanel.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (window.innerWidth > 980 || !sidePanel.classList.contains('open')) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (sidePanel.contains(target) || menuToggle.contains(target)) {
      return;
    }

    sidePanel.classList.remove('open');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
      sidePanel.classList.remove('open');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupMenuToggle();
  loadData();
});
