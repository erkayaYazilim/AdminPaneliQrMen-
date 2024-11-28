const firebaseConfig = {
    apiKey: "AIzaSyC61LqMCJ2u94FFP_ficTFi0qAm2s2b5zk",
    authDomain: "cansufurkan-8514f.firebaseapp.com",
    databaseURL: "https://cansufurkan-8514f-default-rtdb.firebaseio.com",
    projectId: "cansufurkan-8514f",
    storageBucket: "cansufurkan-8514f.appspot.com",
    messagingSenderId: "469450478703",
    appId: "1:469450478703:web:6019d7a41b6508a9b1299a",
    measurementId: "G-5B0936W17P"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let selectedLanguage = 'tr'; // Varsayılan dil

function setLanguage(lang) {
    selectedLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);
    fetchMenuItems();
    loadHeaderText();
}

// Sayfa yüklendiğinde seçili dili kontrol et
document.addEventListener('DOMContentLoaded', () => {
    const lang = localStorage.getItem('selectedLanguage');
    if (lang) {
        selectedLanguage = lang;
    }
    setLanguage(selectedLanguage);
});

// Menü öğelerini Firebase'den çekip kategoriye göre ayırma
async function fetchMenuItems() {
    const menuContent = document.getElementById('menuContent');
    menuContent.innerHTML = ''; // Mevcut içeriği temizle
    const categories = {};

    try {
        // Kategorileri ve ürünleri paralel olarak çekme
        const [catSnapshot, productSnapshot] = await Promise.all([
            database.ref('Categories').once('value'),
            database.ref('Products').once('value')
        ]);

        const categoryData = catSnapshot.val();
        const productsData = productSnapshot.val();

        // Kategorileri ve ürünleri işleme
        for (let productId in productsData) {
            const product = productsData[productId];
            if (product && product.categoryId) {
                const categoryId = product.categoryId;
                if (!categories[categoryId]) {
                    categories[categoryId] = {
                        info: categoryData[categoryId],
                        products: []
                    };
                }
                categories[categoryId].products.push(product);
            }
        }

        // Kategorileri ve ürünleri oluşturma
        for (let categoryId in categories) {
            const categoryInfo = categories[categoryId].info;
            const categoryProducts = categories[categoryId].products;

            // Kategori ismini ve resmini seçili dile göre al
            const categoryName = categoryInfo.names[selectedLanguage] || categoryInfo.names['tr'];
            const categoryImageUrl = categoryInfo.imageUrl;

            // Kategori bölümü oluşturma
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('category-container');

            const categoryTitleDiv = document.createElement('div');
            categoryTitleDiv.classList.add('category');

            // Kategori başlığına arka plan resmi ekleme
            categoryTitleDiv.style.backgroundImage = `url(${categoryImageUrl})`;

            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = categoryName;

            categoryTitleDiv.addEventListener('click', () => {
                toggleMenu(categoryId);
            });

            categoryTitleDiv.appendChild(categoryTitle);

            const menuItemsDiv = document.createElement('div');
            menuItemsDiv.classList.add('menu-items');
            menuItemsDiv.id = categoryId;

            categoryProducts.forEach(product => {
                const menuItemDiv = document.createElement('div');
                menuItemDiv.classList.add('menu-item');

                // Ürün isimlerini ve açıklamalarını seçili dile göre al
                const productName = product.names[selectedLanguage] || product.names['tr'];
                const productDescription = product.descriptions[selectedLanguage] || product.descriptions['tr'];

                // Resim öğesini oluşturma
                const img = document.createElement('img');
                img.src = product.imageUrl;
                img.alt = productName;

                // Resim yüklendiğinde bir önbellek ekleme
                img.onload = () => {
                    img.style.filter = 'blur(0)';
                };

                // Resmi bulanık göstererek yüklenirken kullanıcı deneyimini iyileştirme
                img.style.filter = 'blur(10px)';

                img.addEventListener('click', () => {
                    openImageModal(product.imageUrl, productName);
                });

                const itemInfoDiv = document.createElement('div');
                itemInfoDiv.classList.add('item-info');

                const h3 = document.createElement('h3');
                h3.textContent = productName;

                const p = document.createElement('p');
                p.textContent = productDescription;

                itemInfoDiv.appendChild(h3);
                itemInfoDiv.appendChild(p);

                const priceSpan = document.createElement('span');
                priceSpan.classList.add('price');
                priceSpan.textContent = `₺${product.price}`;

                menuItemDiv.appendChild(img);
                menuItemDiv.appendChild(itemInfoDiv);
                menuItemDiv.appendChild(priceSpan);

                menuItemsDiv.appendChild(menuItemDiv);
            });

            categoryDiv.appendChild(categoryTitleDiv);
            categoryDiv.appendChild(menuItemsDiv);
            menuContent.appendChild(categoryDiv);
        }

    } catch (error) {
        console.error('Veriler alınırken hata oluştu:', error);
    }
}

// Menü öğesini aç/kapat
function toggleMenu(categoryId) {
    const menu = document.getElementById(categoryId);
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        // Tüm açık menüleri kapat
        const allMenus = document.querySelectorAll('.menu-items');
        allMenus.forEach(m => {
            m.style.display = 'none';
        });

        menu.style.display = "block";
    }
}

// Başlık metinlerini yükle
function loadHeaderText() {
    const restaurantNameElem = document.getElementById('restaurantName');
    const restaurantTaglineElem = document.getElementById('restaurantTagline');

    const headerTextsRef = database.ref(`Languages/${selectedLanguage}/headerTexts`);
    headerTextsRef.once('value', (snapshot) => {
        const texts = snapshot.val();
        if (texts) {
            restaurantNameElem.textContent = texts.restaurantName;
            restaurantTaglineElem.textContent = texts.tagline;
        }
    });
}

// Ürün resmi modalını açma
function openImageModal(imageUrl, altText) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = imageUrl;
    modalImg.alt = altText;
}

// Modalı kapatma
const modal = document.getElementById('imageModal');
const modalClose = document.getElementById('modalClose');

modalClose.onclick = function() {
    modal.style.display = "none";
};

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

// Kategorileri Firebase'den çek ve listele
function loadCategories() {
    const categoriesRef = database.ref('Categories').orderByChild('order');
    categoriesRef.on('value', (snapshot) => {
        const categories = snapshot.val();
        const sortableList = document.getElementById('sortableCategories');
        sortableList.innerHTML = '';

        for (let categoryId in categories) {
            const category = categories[categoryId];
            const li = document.createElement('li');
            li.classList.add('category-item');
            li.setAttribute('data-id', categoryId);
            li.textContent = category['name_tr'] || 'Kategori İsmi Yok';
            sortableList.appendChild(li);
        }

        // SortableJS ile sıralanabilir hale getir
        new Sortable(sortableList, {
            animation: 150,
            onEnd: updateCategoryOrder
        });
    });
}

// Kategori sırasını güncelle
function updateCategoryOrder(evt) {
    const items = evt.to.children;
    for (let i = 0; i < items.length; i++) {
        const categoryId = items[i].getAttribute('data-id');
        database.ref('Categories/' + categoryId).update({
            order: i
        });
    }
}

// Sayfa yüklendiğinde kategorileri yükle
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

