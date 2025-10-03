// script.js (VERSI TERBARU: multi dropdown produk + warna + size + export PDF)
(function() {
  'use strict';

  /* ---------------- helpers ---------------- */
  function generatePaymentID() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${yyyy}${mm}${dd}-${random}`;
  }

  function formatCurrency(num) {
    const n = Number(num || 0);
    return n.toLocaleString('id-ID');
  }

  function parseCurrencyToNumber(str) {
    if (str === undefined || str === null) return 0;
    if (typeof str === 'number') return str;
    let s = String(str).trim();
    if (s === '') return 0;
    s = s.replace(/\s/g, '');
    if (s.indexOf('.') > -1 && s.indexOf(',') > -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
    s = s.replace(/[^0-9.\-]+/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /* ---------------- DOM elements ---------------- */
  const paymentIDElem = document.getElementById("payment-id");
  const invoiceDateElem = document.getElementById("invoice-date");
  const buyerNameInput = document.getElementById("buyer-name-input");
  const buyerPhoneInput = document.getElementById("buyer-phone-input");

  const productType = document.getElementById("product-type");
  const productColor = document.getElementById("product-color");
  const productSize = document.getElementById("product-size");

  const itemQtyInput = document.getElementById("item-qty");
  const itemPriceInput = document.getElementById("item-price");
  const addItemBtn = document.getElementById("add-item-btn");
  const itemsTableBody = document.querySelector("#items-table tbody");

  const totalAmountElem = document.getElementById("total-amount");
  const paidAmountInput = document.getElementById("paid-amount");
  const changeAmountElem = document.getElementById("change-amount");
  const exportPdfBtn = document.getElementById("export-pdf-btn");

  if (paymentIDElem) paymentIDElem.textContent = generatePaymentID();
  if (invoiceDateElem) invoiceDateElem.textContent = new Date().toLocaleDateString("id-ID");

  let currentTotal = 0;

  /* ---------------- products dropdown ---------------- */
  if (typeof products === "undefined") {
    console.error("Products array belum didefinisikan!");
    return;
  }

  if (productType) {
    // isi dropdown produk
    products.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.kode;
      opt.textContent = `${p.nama} - Rp ${formatCurrency(p.harga)}`;
      productType.appendChild(opt);
    });

    // event pilih produk → isi warna & size
    productType.addEventListener("change", function () {
      productColor.innerHTML = '<option value="">Pilih Warna</option>';
      productSize.innerHTML = '<option value="">Pilih Ukuran</option>';

      const selected = products.find(p => p.kode === this.value);
      if (selected) {
        selected.warna.forEach(w => {
          const opt = document.createElement("option");
          opt.value = w;
          opt.textContent = w;
          productColor.appendChild(opt);
        });
        selected.size.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          productSize.appendChild(opt);
        });
        itemPriceInput.value = selected.harga;
      }
    });
  }

  /* ---------------- total & change ---------------- */
  function updateTotal() {
    let total = 0;
    if (!itemsTableBody) return;
    itemsTableBody.querySelectorAll("tr").forEach(row => {
      const subtotalText = row.cells[3] ? row.cells[3].textContent : "";
      const subtotalNum = parseCurrencyToNumber(subtotalText);
      total += subtotalNum;
    });
    currentTotal = total;
    if (totalAmountElem) totalAmountElem.textContent = formatCurrency(total);
    updateChange();
  }

  function updateChange() {
    const total = currentTotal;
    const paid = paidAmountInput ? parseCurrencyToNumber(paidAmountInput.value) : 0;
    const change = paid - total;
    if (changeAmountElem) changeAmountElem.textContent = formatCurrency(change);
  }

  if (paidAmountInput) {
    paidAmountInput.addEventListener("input", updateChange);
  }

  /* ---------------- add item ---------------- */
  if (addItemBtn && itemsTableBody) {
    addItemBtn.addEventListener("click", function () {
      const kode = productType.value;
      const warna = productColor.value;
      const size = productSize.value;
      const qty = parseFloat(itemQtyInput.value) || 0;
      let price = parseCurrencyToNumber(itemPriceInput.value);

      if (!kode || !warna || !size || qty <= 0) {
        alert("Mohon pilih produk, warna, ukuran & jumlah!");
        return;
      }

      const produk = products.find(p => p.kode === kode);
      if (!produk) { alert("Produk tidak ditemukan"); return; }
      if (!price || price <= 0) price = produk.harga;

      const subtotal = qty * price;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${produk.nama} - ${warna} Size ${size}</td>
        <td>${qty}</td>
        <td>Rp ${formatCurrency(price)}</td>
        <td>Rp ${formatCurrency(subtotal)}</td>
        <td><button class="delete-btn">Hapus</button></td>
      `;
      itemsTableBody.appendChild(row);

      // reset
      productType.value = "";
      productColor.innerHTML = '<option value="">Pilih Warna</option>';
      productSize.innerHTML = '<option value="">Pilih Ukuran</option>';
      itemQtyInput.value = "";
      itemPriceInput.value = "";

      // delete handler
      row.querySelector(".delete-btn").addEventListener("click", function () {
        row.remove();
        updateTotal();
      });

      updateTotal();
    });
  }

  /* ---------------- export PDF ---------------- */
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", function () {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Library jsPDF belum termuat. Pastikan CDN jsPDF ada di index.html");
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      let y = 50;
      const lineHeight = 18;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE PEMBAYARAN", margin, y);

      const img = new Image();
      img.src = "gambar/logoitem.png";
      img.onload = generatePDF;
      img.onerror = generatePDF;

      function generatePDF() {
        try {
          if (img.complete) doc.addImage(img, 'PNG', 450, 20, 80, 60);
        } catch (e) { console.warn("Logo tidak dapat dimasukkan:", e); }

        y += 40;

        const total = currentTotal;
        const paid = paidAmountInput ? parseCurrencyToNumber(paidAmountInput.value) : 0;
        const change = paid - total;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice ID: ${paymentIDElem ? paymentIDElem.textContent : ""}`, margin, y); y += lineHeight;
        doc.text(`Tanggal: ${invoiceDateElem ? invoiceDateElem.textContent : ""}`, margin, y); y += lineHeight;
        doc.text(`Nama Pembeli: ${buyerNameInput ? buyerNameInput.value : ""}`, margin, y); y += lineHeight;
        doc.text(`No HP: ${buyerPhoneInput ? buyerPhoneInput.value : ""}`, margin, y); y += lineHeight + 6;

        // Header tabel
        doc.setFont("helvetica", "bold");
        const tableHeaders = ["No", "Nama Produk", "Harga", "Jumlah", "Subtotal"];
        const colPositions = [margin, margin + 40, margin + 220, margin + 320, margin + 430];
        tableHeaders.forEach((h, i) => doc.text(h, colPositions[i], y));
        y += lineHeight;
        doc.setLineWidth(0.5);
        doc.line(margin, y - 10, 550, y - 10);

        // Isi tabel
        doc.setFont("helvetica", "normal");
        let no = 1;
        if (itemsTableBody) {
          itemsTableBody.querySelectorAll("tr").forEach(row => {
            const cols = row.querySelectorAll("td");
            if (!cols || cols.length < 4) return;

            doc.text(String(no), colPositions[0], y);

            // Wrap nama produk
            const productName = doc.splitTextToSize(cols[0].textContent, 150);
            doc.text(productName, colPositions[1], y);
            doc.text(cols[2].textContent.replace(/Rp\s*/, '').trim(), colPositions[2], y, { align: "right" });
            doc.text(cols[1].textContent, colPositions[3], y, { align: "center" });
            doc.text(cols[3].textContent.replace(/Rp\s*/, '').trim(), colPositions[4], y, { align: "right" });
            y += productName.length * lineHeight;
            no++;

            if (y > 750) {
              doc.addPage();
              y = 50;
            }
          });
        }

        y += 10;
        doc.line(margin, y, 550, y); y += 20;
        doc.setFont("helvetica", "bold");
        doc.text(`Total: Rp ${formatCurrency(total)}`, 550, y, { align: "right" }); y += lineHeight;
        doc.text(`Uang Dibayar: Rp ${formatCurrency(paid)}`, 550, y, { align: "right" }); y += lineHeight;
        doc.text(`Kembalian: Rp ${formatCurrency(change)}`, 550, y, { align: "right" }); y += lineHeight + 10;

        // ucapan terima kasih
        doc.setFont("helvetica", "italic");
        doc.text("Terima kasih telah berbelanja di Estafold", 370, y, { align: "right" });
        y += lineHeight + 10;

        // Catatan
        doc.setFont("helvetica", "bold");
        doc.text("Catatan:", margin, y);
        y += lineHeight;
        doc.setFont("helvetica", "normal");
        const notes = [
          "* Untuk Jenis sablon DTF design dibawah 2 mm atau gradasi terlalu tipis ada kemungkinan tidak tercetak.",
          "* Warna sablon tidak bisa sama persis dgn warna yg di layar, hanya bisa mengikuti 80% dari warna design.",
          "* Khusus Sablon, Batas retur 3 hari setelah pengambilan barang, dengan syarat barang masih baru.",
          "* Dengan dilakukannya pembayaran atas invoice ini, maka customer telah menyepakati semua ketentuan-ketentuan di atas.",
          "* Jika terjadi kesalahan ketika barang diterima, maka invoice ini yang akan menjadi acuan kami.",
          "* Pembayaran hanya melalui rekening BCA A/N DIMAS NUUR ALFATH 0050722481",
          "* Barang yang sudah dibeli tidak dapat dikembalikan."
        ];
        notes.forEach(note => {
          const splitNote = doc.splitTextToSize(note, 500);
          doc.text(splitNote, margin, y);
          y += splitNote.length * lineHeight;
        });

        // Simpan PDF
        doc.save(`Estafold-${paymentIDElem ? paymentIDElem.textContent : 'INV'}.pdf`);
      }
    });
  }

  if (buyerNameInput) buyerNameInput.addEventListener("input", () => buyerNameInput.setAttribute("value", buyerNameInput.value));
  if (buyerPhoneInput) buyerPhoneInput.addEventListener("input", () => buyerPhoneInput.setAttribute("value", buyerPhoneInput.value));

  updateTotal();
})();
