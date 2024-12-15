const firebaseConfig = {
    apiKey: "AIzaSyA16M_6xOrUGEn9YCdzIFxBYXr-9ST7IWY",
    authDomain: "qrmenuapplication-9b920.firebaseapp.com",
    databaseURL: "https://qrmenuapplication-9b920-default-rtdb.firebaseio.com",
    projectId: "qrmenuapplication-9b920",
    storageBucket: "qrmenuapplication-9b920.appspot.com",
    messagingSenderId: "1050979828232",
    appId: "1:1050979828232:web:54d81e21056193bee147bd",
    measurementId: "G-C3S611TREX"
};
// Firebase yapılandırması
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();
const auth = firebase.auth();
let file;

function resizeAndCompressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            // En boy oranını koruyarak yeniden boyutlandırma
            if (width > maxWidth || height > maxHeight) {
                if (width / height > maxWidth / maxHeight) {
                    height *= maxWidth / width;
                    width = maxWidth;
                } else {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            // Kalite ayarıyla veri URL'si elde etme
            const dataURL = canvas.toDataURL('image/jpeg', quality);
            callback(dataURL);
        };
    };
}

// Giriş işlemi
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById('loginDiv').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            loadCategories();
            loadProducts();
        })
        .catch((error) => {
            alert('Giriş başarısız: ' + error.message);
        });
}

// Çıkış işlemi
function logout() {
    auth.signOut().then(() => {
        document.getElementById('loginDiv').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
    });
}

// Kategorileri yükleme
function loadCategories() {
    const sortableList = document.getElementById('sortableCategories');
    const productCategorySelect = document.getElementById('productCategory');
    const filterCategorySelect = document.getElementById('filterCategory');
    const updateProductCategorySelect = document.getElementById('updateProductCategory');
    sortableList.innerHTML = '';
    productCategorySelect.innerHTML = '<option value="">Kategori Seçin</option>';
    filterCategorySelect.innerHTML = '<option value="">Hepsi</option>';
    updateProductCategorySelect.innerHTML = '<option value="">Kategori Seçin</option>';

    database.ref('Categories').orderByChild('order').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const category = childSnapshot.val();
            const categoryId = childSnapshot.key;
            const categoryName = category.name_tr;
            const categoryStatus = category.status || 'active';

            // Kategori listesine ekleme
            const li = document.createElement('li');
            li.classList.add('category-item');
            li.setAttribute('data-id', categoryId);

            const categoryInfoDiv = document.createElement('div');
            categoryInfoDiv.classList.add('category-info');
            categoryInfoDiv.textContent = categoryName;

            if (categoryStatus === 'inactive') {
                categoryInfoDiv.style.color = 'gray';
                categoryInfoDiv.textContent += ' (Askıda)';
            }

            // Düzenle ve sil butonları
            const editButton = document.createElement('button');
            editButton.textContent = 'Düzenle';
            editButton.onclick = () => openUpdateCategoryModal(categoryId);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Sil';
            deleteButton.onclick = () => deleteCategory(categoryId);

            li.appendChild(categoryInfoDiv);
            li.appendChild(editButton);
            li.appendChild(deleteButton);

            sortableList.appendChild(li);

            // Eğer kategori aktif ise ürün ekleme ve filtreleme seçeneklerine ekle
            if (categoryStatus === 'active') {
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = category.name_tr;
                productCategorySelect.appendChild(option);

                const filterOption = document.createElement('option');
                filterOption.value = categoryId;
                filterOption.textContent = category.name_tr;
                filterCategorySelect.appendChild(filterOption);

                const updateOption = document.createElement('option');
                updateOption.value = categoryId;
                updateOption.textContent = category.name_tr;
                updateProductCategorySelect.appendChild(updateOption);
            }
        });

        // SortableJS ile sıralanabilir hale getir
        new Sortable(sortableList, {
            animation: 150,
            onEnd: updateCategoryOrder
        });
    });
}

function updateCategoryOrder(evt) {
    const items = evt.to.children;
    for (let i = 0; i < items.length; i++) {
        const categoryId = items[i].getAttribute('data-id');
        database.ref('Categories/' + categoryId).update({
            order: i
        });
    }
}

// Yeni kategori ekleme
document.getElementById('newCategoryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name_tr = document.getElementById('categoryName_tr').value;
    const name_en = document.getElementById('categoryName_en').value; // İngilizce kategori ismi
    const categoryImageFile = document.getElementById('categoryImage').files[0];

    // İlerleme çubuğunu göster
    document.getElementById('categoryProgressBar').style.display = 'block';

    // Resmi yeniden boyutlandır ve sıkıştır
    resizeAndCompressImage(categoryImageFile, 800, 800, 0.7, function(dataUrl) {
        // Data URL'sini Blob'a dönüştür
        const blob = dataURItoBlob(dataUrl);

        // Firebase Storage'a yükleme
        const storageRef = storage.ref('categoryImages/' + categoryImageFile.name);
        const uploadTask = storageRef.put(blob);

        uploadTask.on('state_changed',
            (snapshot) => {
                // İlerleme yüzdesini hesapla
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('categoryProgressBarFill').style.width = progress + '%';
                document.getElementById('categoryProgressBarFill').textContent = Math.round(progress) + '%';
            },
            (error) => {
                alert('Yükleme hatası: ' + error.message);
            },
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then((url) => {
                    // Yeni kategorinin 'order' değeri, mevcut kategorilerin sayısı olabilir
                    database.ref('Categories').once('value').then((snapshot) => {
                        const categoryCount = snapshot.numChildren();
                        const newCategoryKey = database.ref().child('Categories').push().key;
                        database.ref('Categories/' + newCategoryKey).set({
                            name_tr: name_tr,
                            name_en: name_en, // İngilizce ismi kayıt et
                            imageUrl: url,
                            order: categoryCount, // Yeni kategori en sona eklenir
                            status: 'active' // Varsayılan olarak aktif
                        }).then(() => {
                            alert('Kategori başarıyla eklendi!');
                            document.getElementById('newCategoryForm').reset();
                            document.getElementById('categoryImagePreview').style.display = 'none';
                            document.getElementById('categoryProgressBar').style.display = 'none';
                            loadCategories();
                        });
                    });
                });
            }
        );
    });
});

// Kategori silme
function deleteCategory(categoryId) {
    const confirmDelete = confirm("Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.");
    if (confirmDelete) {
        // Kategori altındaki ürünleri sil
        database.ref('Products').orderByChild('categoryId').equalTo(categoryId).once('value', (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                database.ref('Products/' + childSnapshot.key).remove();
            });

            // Kategoriyi sil
            database.ref('Categories/' + categoryId).remove()
                .then(() => {
                    alert("Kategori ve ilgili ürünler başarıyla silindi!");
                    loadCategories();
                    loadProducts();
                })
                .catch((error) => {
                    alert("Silme hatası: " + error.message);
                });
        });
    }
}

// Kategori düzenleme modalını açma
function openUpdateCategoryModal(categoryId) {
    const modal = document.getElementById('updateCategoryModal');
    modal.style.display = 'block';

    // Kategori bilgilerini doldurma
    database.ref('Categories/' + categoryId).once('value', (snapshot) => {
        const category = snapshot.val();

        document.getElementById('updateCategoryId').value = categoryId;
        document.getElementById('updateCategoryName_tr').value = category.name_tr;
        document.getElementById('updateCategoryName_en').value = category.name_en || ''; // İngilizce ismi doldur
        document.getElementById('updateCategoryStatus').value = category.status || 'active';

        // Mevcut kategori resmini önizleme olarak göster
        const preview = document.getElementById('updateCategoryImagePreview');
        preview.src = category.imageUrl;
        preview.style.display = 'block';
    });
}

// Kategori güncelleme formunda resim seçildiğinde önizleme
document.getElementById('updateCategoryImage').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Resmi yeniden boyutlandır ve önizle
        resizeAndCompressImage(file, 800, 800, 0.7, function(dataUrl) {
            const preview = document.getElementById('updateCategoryImagePreview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        });
    }
});

// Kategori Güncelleme
document.getElementById('updateCategoryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const categoryId = document.getElementById('updateCategoryId').value;
    const name_tr = document.getElementById('updateCategoryName_tr').value;
    const name_en = document.getElementById('updateCategoryName_en').value; // İngilizce kategori ismi
    const status = document.getElementById('updateCategoryStatus').value;
    const categoryImageFile = document.getElementById('updateCategoryImage').files[0];

    // İlerleme çubuğunu göster
    document.getElementById('updateCategoryProgressBar').style.display = 'block';

    if (categoryImageFile) {
        // Resmi yeniden boyutlandır ve sıkıştır
        resizeAndCompressImage(categoryImageFile, 800, 800, 0.7, function(dataUrl) {
            // Data URL'sini Blob'a dönüştür
            const blob = dataURItoBlob(dataUrl);

            // Firebase Storage'a yükleme
            const storageRef = storage.ref('categoryImages/' + categoryImageFile.name);
            const uploadTask = storageRef.put(blob);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // İlerleme yüzdesini hesapla
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    document.getElementById('updateCategoryProgressBarFill').style.width = progress + '%';
                    document.getElementById('updateCategoryProgressBarFill').textContent = Math.round(progress) + '%';
                },
                (error) => {
                    alert('Yükleme hatası: ' + error.message);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then((url) => {
                        updateCategory(categoryId, name_tr, name_en, url, status);
                    });
                }
            );
        });
    } else {
        // Resim değişmeyecekse
        database.ref('Categories/' + categoryId).once('value', (snapshot) => {
            const category = snapshot.val();
            updateCategory(categoryId, name_tr, name_en, category.imageUrl, status);
        });
    }
});

function updateCategory(categoryId, name_tr, name_en, imageUrl, status) {
    database.ref('Categories/' + categoryId).update({
        name_tr: name_tr,
        name_en: name_en,
        imageUrl: imageUrl,
        status: status
    }).then(() => {
        alert('Kategori başarıyla güncellendi!');
        document.getElementById('updateCategoryModal').style.display = 'none';
        document.getElementById('updateCategoryProgressBar').style.display = 'none';
        loadCategories();
        loadProducts();
    });
}

// Modalı Kapatma
document.getElementById('closeCategoryModal').onclick = function() {
    document.getElementById('updateCategoryModal').style.display = 'none';
};

// Ürünleri yükleme
function loadProducts() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';

    const selectedCategory = document.getElementById('filterCategory').value;

    database.ref('Products').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const product = childSnapshot.val();
            const productId = childSnapshot.key;
            const productName = product.name_tr;
            const categoryId = product.categoryId;

            // Eğer kategori filtrelemesi yapılıyorsa
            if (selectedCategory === '' || selectedCategory === categoryId) {
                // Kategori ismini ve durumunu almak için
                database.ref('Categories/' + categoryId).once('value', (categorySnapshot) => {
                    if (categorySnapshot.exists()) {
                        const category = categorySnapshot.val();
                        const categoryName = category.name_tr;
                        const categoryStatus = category.status || 'active';

                        // Askıya alınmış kategorideki ürünleri göstermeyelim
                        if (categoryStatus === 'active') {
                            const div = document.createElement('div');
                            div.classList.add('product-item');
                            div.innerHTML = `
                                <img src="${product.imageUrl}" alt="${productName}">
                                <span>${productName} - ${categoryName}</span>
                                <button onclick="openUpdateModal('${productId}')">Güncelle</button>
                                <button onclick="deleteProduct('${productId}')" class="delete-button">
                                    🗑️
                                </button>
                            `;
                            productsList.appendChild(div);
                        }
                    }
                });
            }
        });
    });
}

// Kategori filtreleme değiştiğinde ürünleri yeniden yükle
document.getElementById('filterCategory').addEventListener('change', loadProducts);

// Yeni ürün ekleme
document.getElementById('newProductForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name_tr = document.getElementById('productName_tr').value;
    const name_en = document.getElementById('productName_en').value; // İngilizce ürün ismi
    const description_tr = document.getElementById('productDesc_tr').value;
    const description_en = document.getElementById('productDesc_en').value; // İngilizce ürün açıklaması
    const price = document.getElementById('productPrice').value;
    const categoryId = document.getElementById('productCategory').value;
    const productImageFile = document.getElementById('fileElem').files[0];

    // İlerleme çubuğunu göster
    document.getElementById('productProgressBar').style.display = 'block';

    // Resmi yeniden boyutlandır ve sıkıştır
    resizeAndCompressImage(productImageFile, 800, 800, 0.7, function(dataUrl) {
        // Data URL'sini Blob'a dönüştür
        const blob = dataURItoBlob(dataUrl);

        // Firebase Storage'a yükleme
        const storageRef = storage.ref('productImages/' + productImageFile.name);
        const uploadTask = storageRef.put(blob);

        uploadTask.on('state_changed',
            (snapshot) => {
                // İlerleme yüzdesini hesapla
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('productProgressBarFill').style.width = progress + '%';
                document.getElementById('productProgressBarFill').textContent = Math.round(progress) + '%';
            },
            (error) => {
                alert('Yükleme hatası: ' + error.message);
            },
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then((url) => {
                    const newProductKey = database.ref().child('Products').push().key;
                    database.ref('Products/' + newProductKey).set({
                        name_tr: name_tr,
                        name_en: name_en,
                        description_tr: description_tr,
                        description_en: description_en,
                        price: price,
                        categoryId: categoryId,
                        imageUrl: url
                    }).then(() => {
                        alert('Ürün başarıyla eklendi!');
                        document.getElementById('newProductForm').reset();
                        document.getElementById('productImagePreview').style.display = 'none';
                        document.getElementById('productProgressBar').style.display = 'none';
                        loadProducts();
                    });
                });
            }
        );
    });
});

// Ürün resmi önizleme
document.getElementById('fileElem').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Resmi yeniden boyutlandır ve önizle
        resizeAndCompressImage(file, 800, 800, 0.7, function(dataUrl) {
            const preview = document.getElementById('productImagePreview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        });
    }
});

// Ürün Güncelleme Modalını Açma
function openUpdateModal(productId) {
    const modal = document.getElementById('updateProductModal');
    modal.style.display = 'block';

    // Ürün bilgilerini doldurma
    database.ref('Products/' + productId).once('value', (snapshot) => {
        const product = snapshot.val();

        document.getElementById('updateProductId').value = productId;
        document.getElementById('updateProductName_tr').value = product.name_tr;
        document.getElementById('updateProductName_en').value = product.name_en || '';
        document.getElementById('updateProductDesc_tr').value = product.description_tr;
        document.getElementById('updateProductDesc_en').value = product.description_en || '';
        document.getElementById('updateProductPrice').value = product.price;
        document.getElementById('updateProductCategory').value = product.categoryId;

        // Mevcut ürün resmini önizleme olarak göster
        const preview = document.getElementById('updateProductImagePreview');
        preview.src = product.imageUrl;
        preview.style.display = 'block';
    });
}

// Ürün güncelleme formunda resim seçildiğinde önizleme
document.getElementById('updateFileElem').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Resmi yeniden boyutlandır ve önizle
        resizeAndCompressImage(file, 800, 800, 0.7, function(dataUrl) {
            const preview = document.getElementById('updateProductImagePreview');
            preview.src = dataUrl;
            preview.style.display = 'block';
        });
    }
});

// Modalı Kapatma
document.getElementById('closeModal').onclick = function() {
    document.getElementById('updateProductModal').style.display = 'none';
};

// Ürün Güncelleme
document.getElementById('updateProductForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const productId = document.getElementById('updateProductId').value;
    const name_tr = document.getElementById('updateProductName_tr').value;
    const name_en = document.getElementById('updateProductName_en').value;
    const description_tr = document.getElementById('updateProductDesc_tr').value;
    const description_en = document.getElementById('updateProductDesc_en').value;
    const price = document.getElementById('updateProductPrice').value;
    const categoryId = document.getElementById('updateProductCategory').value;
    const productImageFile = document.getElementById('updateFileElem').files[0];

    // İlerleme çubuğunu göster
    document.getElementById('updateProgressBar').style.display = 'block';

    if (productImageFile) {
        // Resmi yeniden boyutlandır ve sıkıştır
        resizeAndCompressImage(productImageFile, 800, 800, 0.7, function(dataUrl) {
            // Data URL'sini Blob'a dönüştür
            const blob = dataURItoBlob(dataUrl);

            // Firebase Storage'a yükleme
            const storageRef = storage.ref('productImages/' + productImageFile.name);
            const uploadTask = storageRef.put(blob);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // İlerleme yüzdesini hesapla
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    document.getElementById('updateProgressBarFill').style.width = progress + '%';
                    document.getElementById('updateProgressBarFill').textContent = Math.round(progress) + '%';
                },
                (error) => {
                    alert('Yükleme hatası: ' + error.message);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then((url) => {
                        updateProduct(productId, name_tr, name_en, description_tr, description_en, price, categoryId, url);
                    });
                }
            );
        });
    } else {
        // Resim değişmeyecekse
        database.ref('Products/' + productId).once('value', (snapshot) => {
            const product = snapshot.val();
            updateProduct(productId, name_tr, name_en, description_tr, description_en, price, categoryId, product.imageUrl);
        });
    }
});

function updateProduct(productId, name_tr, name_en, description_tr, description_en, price, categoryId, imageUrl) {
    database.ref('Products/' + productId).set({
        name_tr: name_tr,
        name_en: name_en,
        description_tr: description_tr,
        description_en: description_en,
        price: price,
        categoryId: categoryId,
        imageUrl: imageUrl
    }).then(() => {
        alert('Ürün başarıyla güncellendi!');
        document.getElementById('updateProductModal').style.display = 'none';
        document.getElementById('updateProgressBar').style.display = 'none';
        loadProducts();
    });
}

// Data URL'sini Blob'a dönüştürme fonksiyonu
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return blob;
}

function deleteProduct(productId) {
    const confirmDelete = confirm("Bu ürünü silmek istediğinizden emin misiniz?");
    if (confirmDelete) {
        database.ref('Products/' + productId).remove()
            .then(() => {
                alert("Ürün başarıyla silindi!");
                loadProducts(); // Ürün listesini yeniden yükler
            })
            .catch((error) => {
                alert("Silme hatası: " + error.message);
            });
    }
}

// Sayfa yüklendiğinde giriş durumunu kontrol et
auth.onAuthStateChanged(function(user) {
    if (user) {
        // Kullanıcı giriş yapmışsa
        document.getElementById('loginDiv').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadCategories();
        loadProducts();
    } else {
        // Kullanıcı çıkış yapmışsa
        document.getElementById('loginDiv').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
    }
});
