const DATA_FILES = [
  'data/data_tthc_combined.json',
];

let PROCEDURE_DATA = [];
let CATEGORY_DATA = [];

const appHeader = document.getElementById('app-header');

function createCategoryButton(category, index) {
  const anchor = document.createElement('a');
  anchor.className = 'category-button';
  anchor.href = `#${category.ID}`;
  anchor.dataset.category = category.ID;
  anchor.textContent = `${index}. ${category.NAME} (${PROCEDURE_DATA.filter((proc) => proc.CATEGORY === category.ID).length})`;
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
  //updateCount();
}

function renderCategorySectionById(category_id, procedures) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '';
  const category = CATEGORY_DATA.find((cat) => cat.ID === category_id);

  const categoryProcedures = procedures.filter((procedure) => procedure.CATEGORY === category_id);
    if (categoryProcedures.length === 0) {
      return;
    }

    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = category.ID;

    const heading = document.createElement('h2');
    heading.textContent = category.NAME + ` (${categoryProcedures.length} thủ tục)`;

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

    renderQrCodes();
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
      CATEGORY_DATA = data.CATEGORIES || data.categories || [];
      PROCEDURE_DATA = data.PROCEDURES || data.procedures || [];

      const visibleCategories = CATEGORY_DATA.filter((category) =>
        PROCEDURE_DATA.some((procedure) => procedure.CATEGORY === category.ID)
      );

      const categoryMenu = document.getElementById('categoryMenu');
      categoryMenu.innerHTML = '';
      visibleCategories.forEach((category, index) => {
        categoryMenu.appendChild(createCategoryButton(category, index + 1));
      });


      categoryMenu.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('category-button')) {
          return;
        }

        const currentCategory = CATEGORY_DATA.find((cat) => cat.ID === target.dataset.category);

        event.preventDefault();
        const anchor = target.getAttribute('href');
        if (!anchor) {
          return;
        }

        let navigation = document.getElementById('navigation');
        if (navigation.classList.contains('hidden')) {
          navigation.classList.remove('hidden');
        }

        categoryMenu.classList.add('hidden');
        appHeader.classList.add('hidden');

        renderCategorySectionById(target.dataset.category, PROCEDURE_DATA);
        addNavigationalLinks(currentCategory);
      });
    })
    .catch((error) => {
      const contentArea = document.getElementById('contentArea');
      contentArea.innerHTML = `<p class="error-message">Lỗi khi tải dữ liệu: ${error.message}</p>`;
    });
}

function addNavigationalLinks(category) {
  const navigationCategory = document.getElementById('nav-item-category');
  
  navigationCategory.textContent = category?.NAME || '';
}

function resetPage(){
  renderCategorySections(CATEGORY_DATA, PROCEDURE_DATA);

    let navigation = document.getElementById('navigation');
    navigation.classList.add('hidden');
    
    const navigationCategory = document.getElementById('nav-item-category');
    navigationCategory.textContent = "";

    const categoryMenu = document.getElementById('categoryMenu');
    if (categoryMenu.classList.contains('hidden')) {
      categoryMenu.classList.remove('hidden');
    }
    
    appHeader.classList.remove('hidden');

    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  const homelink = document.getElementById('homelink');
  homelink.addEventListener('click', (event) => {
    event.preventDefault();
    resetPage();
  });
});