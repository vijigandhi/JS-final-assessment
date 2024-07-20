// firebase initialize

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, setDoc, doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAox-51ZlcWdi3e4h9JXLwRFBsXkzKATdc",
    authDomain: "inventary-ce6c9.firebaseapp.com",
    projectId: "inventary-ce6c9",
    storageBucket: "inventary-ce6c9.appspot.com",
    messagingSenderId: "192824489711",
    appId: "1:192824489711:web:0f9f6f91c5fde0f9b70d1a",
    measurementId: "G-5JJSKJE7CW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


document.addEventListener("DOMContentLoaded", () => {
    let addProductButton = document.getElementById("addProduct");
    let updateProductButton = document.getElementById("updateProduct");
    let sortQuantity = document.getElementById("sortQuantity");

    
    //---------------- Highest Quantity Products ---------------------

    async function fetchHighestQuantityProducts() {
        try {
            let productsRef = collection(db, "products");
            let querySnapshot = await getDocs(productsRef);
            let products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let topProducts = [null, null, null];
            for (let product of products) {
                let quantity = product.quantity;
    
                for (let i = 0; i < topProducts.length; i++) {
                    if (topProducts[i] === null || quantity > topProducts[i].quantity) {
                        for (let j = topProducts.length - 1; j > i; j--) {
                            topProducts[j] = topProducts[j - 1];
                        }
                        topProducts[i] = product;
                        break;
                    }
                }
            }
    
            let listContainers = document.querySelectorAll('.highestProductList');
            listContainers.forEach((container, index) => {
                let product = topProducts[index];
                if (product) {
                    container.innerHTML = `<p>${product.name} - ${product.quantity}</p>`;
                } else {
                    container.innerHTML = `<p>No Product</p>`;
                }
            });
        } catch (error) {
            console.error("Error fetching highest quantity products: ", error);
        }
    }
    //------------ Inventory Data ---------------

    async function fetchInventoryData() {
        try {
            let productsRef = collection(db, "products");
            let querySnapshot = await getDocs(productsRef);
            let inventory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            displayBarChart(inventory);
        } catch (error) {
            console.error("Error fetching inventory data: ", error);
        }
    }

    //------------- Recipient Details --------------------

    let isAscending = true; // Variable to keep track of sort order

    async function fetchRecipientDetails() {
        try {
            const updatedProductsRef = collection(db, "updated_products");
            const querySnapshot = await getDocs(updatedProductsRef);
            const updatedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let sortedProducts = [...updatedProducts];
            for (let i = 0; i < sortedProducts.length - 1; i++) {
                for (let j = 0; j < sortedProducts.length - i - 1; j++) {
                    if (isAscending ? sortedProducts[j].quantity > sortedProducts[j + 1].quantity 
                        : sortedProducts[j].quantity < sortedProducts[j + 1].quantity) {
                        // Swap products
                        let temp = sortedProducts[j];
                        sortedProducts[j] = sortedProducts[j + 1];
                        sortedProducts[j + 1] = temp;
                    }
                }
            }

            // Update recipient details table
            const recipientTableBody = document.querySelector("#recipientTable tbody");
            recipientTableBody.innerHTML = ''; 

            sortedProducts.forEach(product => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${product.name || 'N/A'}</td>
                    <td>${product.recipient || 'N/A'}</td>
                    <td>${product.quantity || 0}</td>
                `;
                recipientTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error fetching recipient details: ", error);
        }
    }

    sortQuantity.addEventListener("click", async () => {
        isAscending = !isAscending;
        await fetchRecipientDetails(); 
        // alert(isAscending ? "Sorted in Ascending Order" : "Sorted in Descending Order");
    });

    //----------- barchart -----------------

    function displayBarChart(inventory) {
        if (!inventory || inventory.length === 0) {
            console.error("No inventory data available.");
            return;
        }

        let validInventory = inventory.filter(item => item.name && item.quantity !== undefined);
        let labels = validInventory.map(item => item.name);
        let data = validInventory.map(item => item.quantity);

        let colors = ['red','yellow','green','orange','purple','gray','violet'];

        if (labels.length === 0 || data.length === 0) {
            console.error("No valid data to display in the chart.");
            return;
        }

        let barChart = document.getElementById('myChart').getContext('2d');
        new Chart(barChart, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Inventory Status',
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(color => color.replace(/0\.2/, '1')),
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    //------------ add products in firestore --------------

    async function addProduct(formData) {
        try {
            let jsonData = {};
            formData.forEach((value, key) => {
                jsonData[key] = value;
            });

            let productId = jsonData.productId;

            if (!productId) {
                throw new Error("Product ID is required.");
            }

            await setDoc(doc(db, "products", productId), {
                name: jsonData.productName,
                quantity: Number(jsonData.productQuantity)
            });

            Swal.fire({
                title: "Good job!",
                text: "Product added successfully!",
                icon: "success"
            });
        } catch (e) {
            console.error("Error adding product: ", e);
            Swal.fire({
                title: "Error!",
                text: e.message || "There was an error processing your request.",
                icon: "error"
            });
        }
    }

    //------------ update product in firestore --------------------

    async function updateProduct(formData) {
        try {
            let jsonData = {};
            formData.forEach((value, key) => {
                jsonData[key] = value;
            });

            let oldProductId = jsonData.updateProductId;

            if (!oldProductId) {
                throw new Error("Product ID is required for updating.");
            }

            let oldProductRef = doc(db, "products", oldProductId);
            let oldProductSnap = await getDoc(oldProductRef);

            if (oldProductSnap.exists()) {
                let oldProductData = oldProductSnap.data();
                let newQuantity = Number(jsonData.updateProductQuantity);
                let quantityToSubtract = oldProductData.quantity - newQuantity;

                if (quantityToSubtract < 0) {
                    throw new Error("Update quantity cannot exceed the existing quantity.");
                }

                await updateDoc(oldProductRef, {
                    quantity: quantityToSubtract
                });

                await setDoc(doc(db, "updated_products", oldProductId), {
                    ...oldProductData,
                    quantity: newQuantity,
                    recipient: jsonData.recipient,
                    updatedAt: new Date()
                });

                Swal.fire({
                    title: "Good job!",
                    text: "Product updated successfully!",
                    icon: "success"
                });
            } else {
                throw new Error("Old product not found.");
            }
        } catch (e) {
            console.error("Error updating product: ", e);
            Swal.fire({
                title: "Error!",
                text: e.message || "There was an error processing your request.",
                icon: "error"
            });
        }
    }

    //--------------- popup form ------------------------

    async function showPopup(formType) {
        let popupOverlay = document.createElement("div");
        popupOverlay.classList.add("popup-overlay");
        document.body.appendChild(popupOverlay);

        let productPopup = document.createElement("div");
        productPopup.classList.add("popup");

        let formContent = formType === 'add'
            ? `
                <button class="close-btn" id="closePopup">×</button>
                <h2 class="popupTitles">Add Product</h2>
                <form id="productForm">
                    <label for="productId">Product ID:</label>
                    <input type="text" id="productId" name="productId" required>
                
                    <label for="productName">Product Name:</label>
                    <input type="text" id="productName" name="productName" required>
               
                    <label for="productQuantity">Quantity:</label>
                    <input type="number" id="productQuantity" name="productQuantity" required>
                  
                    <button type="submit">Add Product</button>
                </form>
              `
            : `
                <button class="close-btn" id="closePopup">×</button>
                <h2 class="popupTitles">Update Product</h2>
                <form id="updateProductForm">
                    <label for="updateProductId">Product ID:</label>
                    <input type="text" id="updateProductId" name="updateProductId" required>
                
                    <label for="updateProductName">Product Name:</label>
                    <input type="text" id="updateProductName" name="updateProductName" required>
                  
                    <label for="updateProductQuantity">Quantity:</label>
                    <input type="number" id="updateProductQuantity" name="updateProductQuantity" required>
                   
                    <label for="recipient">Recipient:</label>
                    <input type="text" id="recipient" name="recipient" required>
                   
                    <button type="submit">Update Product</button>
                </form>
              `;

        productPopup.innerHTML = formContent;
        document.body.appendChild(productPopup);

        productPopup.style.display = "block";
        popupOverlay.style.display = "block";

    
        function closePopup() {
            if (document.body.contains(productPopup)) {
                document.body.removeChild(productPopup);
            }
            if (document.body.contains(popupOverlay)) {
                document.body.removeChild(popupOverlay);
            }
        }

        let closePopupButton = document.getElementById("closePopup");
        closePopupButton.addEventListener("click", closePopup);
        popupOverlay.addEventListener("click", closePopup);

        let form = formType === 'add' ? document.getElementById("productForm") : document.getElementById("updateProductForm");
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            let formData = new FormData(form);

            if (formType === 'add') {
                await addProduct(formData);
            } else {
                await updateProduct(formData);
            }

            closePopup();
            fetchHighestQuantityProducts();
            fetchInventoryData();
            fetchRecipientDetails();
        });
    }

    addProductButton.addEventListener("click", () => showPopup('add'));
    updateProductButton.addEventListener("click", () => showPopup('update'));

    fetchHighestQuantityProducts();
    fetchInventoryData();
    fetchRecipientDetails();
});
