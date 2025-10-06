(function () {
  'use strict';

  /* ---------------- Helpers ---------------- */
  function generatePaymentID() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const r = Math.floor(1000 + Math.random() * 9000);
    return `INV-${yyyy}${mm}${dd}-${r}`;
  }

  function formatCurrency(num) {
    const n = Number(num || 0);
    return n.toLocaleString('id-ID');
  }

  function parseCurrencyToNumber(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    let s = str.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.\-]+/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // --- Generate kode validasi unik dari InvoiceID + Total ---
  function generateValidationCode(invoiceID, total) {
    const raw = `${invoiceID}-${total}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  }

  /* ---------------- DOM ---------------- */
  const paymentIDElem = document.getElementById('payment-id');
  const invoiceDateElem = document.getElementById('invoice-date');
  const buyerNameInput = document.getElementById('buyer-name-input');
  const buyerPhoneInput = document.getElementById('buyer-phone-input');

  const productType = document.getElementById('product-type');
  const productColor = document.getElementById('product-color');
  const productSize = document.getElementById('product-size');
  const itemQtyInput = document.getElementById('item-qty');
  const itemPriceInput = document.getElementById('item-price');
  const addItemBtn = document.getElementById('add-item-btn');
  const itemsTableBody = document.querySelector('#items-table tbody');

  const totalAmountElem = document.getElementById('total-amount');
  const paidAmountInput = document.getElementById('paid-amount');
  const changeAmountElem = document.getElementById('change-amount');
  const exportPdfBtn = document.getElementById('export-pdf-btn');

  if (paymentIDElem) paymentIDElem.textContent = generatePaymentID();
  if (invoiceDateElem) invoiceDateElem.textContent = new Date().toLocaleDateString('id-ID');

  let currentTotal = 0;

  /* ---------------- Dropdown Produk ---------------- */
  if (typeof products !== 'undefined' && Array.isArray(products)) {
    console.log(`✅ Memuat ${products.length} produk`);
    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.kode;
      option.textContent = product.nama;
      productType.appendChild(option);
    });
  } else {
    console.error("❌ products.js belum termuat atau tidak berisi array");
  }

  /* ---------------- Dropdown Warna & Ukuran Dinamis ---------------- */
  productType.addEventListener('change', () => {
    const selectedCode = productType.value;
    const selectedProduct = products.find(p => p.kode === selectedCode);

    productColor.innerHTML = '<option value="">Pilih Warna</option>';
    productSize.innerHTML = '<option value="">Pilih Ukuran</option>';
    itemPriceInput.value = '';

    if (!selectedProduct) return;

    // Warna
    if (Array.isArray(selectedProduct.warna)) {
      selectedProduct.warna.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        productColor.appendChild(opt);
      });
    }

    // Ukuran
    if (Array.isArray(selectedProduct.size)) {
      selectedProduct.size.forEach(s => {
        const opt = document.createElement('option');
        if (typeof s === 'object') {
          opt.value = s.nama;
          opt.textContent = s.nama;
        } else {
          opt.value = s;
          opt.textContent = s;
        }
        productSize.appendChild(opt);
      });
    }

    // Harga default
    if (selectedProduct.harga) {
      itemPriceInput.placeholder = `Rp ${formatCurrency(selectedProduct.harga)}`;
    } else {
      itemPriceInput.placeholder = 'Harga sesuai size sablon';
    }
  });

  // Update harga otomatis jika size sablon dipilih
  productSize.addEventListener('change', () => {
    const selectedCode = productType.value;
    const selectedProduct = products.find(p => p.kode === selectedCode);
    if (!selectedProduct) return;

    const sizeName = productSize.value;
    if (selectedProduct.kategori === 'Sablon' && Array.isArray(selectedProduct.size)) {
      const sizeData = selectedProduct.size.find(s => s.nama === sizeName);
      if (sizeData) itemPriceInput.value = sizeData.harga;
    } else if (selectedProduct.harga) {
      itemPriceInput.value = selectedProduct.harga;
    }
  });

  /* ---------------- Box Ringkasan (Flex) ---------------- */
  const totalsWrapper = document.createElement('div');
  totalsWrapper.id = 'totals-wrapper';
  totalsWrapper.style.display = 'flex';
  totalsWrapper.style.justifyContent = 'space-between';
  totalsWrapper.style.alignItems = 'center';
  totalsWrapper.style.gap = '10px';
  totalsWrapper.style.marginTop = '15px';
  totalsWrapper.style.flexWrap = 'wrap';
  itemsTableBody.parentElement.insertAdjacentElement('afterend', totalsWrapper);

  const totalsInfo = document.createElement('div');
  totalsInfo.id = 'totals-info';
  totalsInfo.style.flex = '1';
  totalsInfo.style.fontWeight = 'bold';
  totalsInfo.style.backgroundColor = '#f3f3f3';
  totalsInfo.style.padding = '8px 10px';
  totalsInfo.style.borderRadius = '6px';
  totalsInfo.style.border = '1px solid #ddd';
  totalsWrapper.appendChild(totalsInfo);

  const discountInfo = document.createElement('div');
  discountInfo.id = 'discount-info';
  discountInfo.style.flex = '1';
  discountInfo.style.fontWeight = 'bold';
  discountInfo.style.backgroundColor = '#e8f9e8';
  discountInfo.style.padding = '8px 10px';
  discountInfo.style.border = '1px solid #b8e6b8';
  discountInfo.style.borderRadius = '6px';
  discountInfo.style.textAlign = 'right';
  totalsWrapper.appendChild(discountInfo);

  function updateTotalsInfoDisplay(totalBaju, totalSablon) {
    totalsInfo.innerHTML = `<p>Total Baju: ${totalBaju} pcs  |  Total Sablon: ${totalSablon} pcs</p>`;
  }

  function updateDiscountDisplay(totalDiskon) {
    discountInfo.innerHTML = `<p>Total Diskon: Rp ${formatCurrency(totalDiskon)}</p>`;
  }

  /* ---------------- Hitung Total ---------------- */
  function updateQtySummary() {
    let totalBaju = 0, totalSablon = 0;
    itemsTableBody.querySelectorAll('tr').forEach(row => {
      const kode = row.getAttribute('data-kode');
      const qty = parseFloat(row.getAttribute('data-qty')) || 0;
      if (kode === 'SBLN') totalSablon += qty;
      else totalBaju += qty;
    });
    updateTotalsInfoDisplay(totalBaju, totalSablon);
    return { totalBaju, totalSablon };
  }

  function updateTotalDiscount() {
    let totalDiskon = 0;
    itemsTableBody.querySelectorAll('tr').forEach(row => {
      const qty = parseFloat(row.getAttribute('data-qty')) || 0;
      const diskonText = row.cells[3]?.textContent || '0';
      const diskonPerItem = parseCurrencyToNumber(diskonText);
      totalDiskon += diskonPerItem * qty;
    });
    updateDiscountDisplay(totalDiskon);
    return totalDiskon;
  }

  /* ---------------- Diskon ---------------- */
  function applyBajuDiscount(kode) {
    const rows = Array.from(itemsTableBody.querySelectorAll('tr')).filter(r => r.getAttribute('data-kode') === kode);
    let totalQty = 0;
    rows.forEach(r => totalQty += parseFloat(r.getAttribute('data-qty') || 0));

    rows.forEach(r => {
      const basePrice = parseFloat(r.getAttribute('data-baseprice') || 0);
      const qty = parseFloat(r.getAttribute('data-qty') || 0);
      let diskonPerItem = 0;
      if (totalQty >= 48) diskonPerItem = 2000;
      else if (totalQty >= 24) diskonPerItem = 1000;

      const hargaAkhir = Math.max(0, basePrice - diskonPerItem);
      r.cells[2].textContent = `Rp ${formatCurrency(basePrice)}`;
      r.cells[3].textContent = `Rp ${formatCurrency(diskonPerItem)}`;
      r.cells[4].textContent = `Rp ${formatCurrency(hargaAkhir)}`;
      r.cells[5].textContent = `Rp ${formatCurrency(hargaAkhir * qty)}`;
    });

    updateTotal();
  }

  function applySablonDiscount() {
    const rows = Array.from(itemsTableBody.querySelectorAll('tr')).filter(r => r.getAttribute('data-kode') === 'SBLN');
    let totalQty = 0;
    rows.forEach(r => totalQty += parseFloat(r.getAttribute('data-qty') || 0));

    rows.forEach(r => {
      const basePrice = parseFloat(r.getAttribute('data-baseprice') || 0);
      const qty = parseFloat(r.getAttribute('data-qty') || 0);
      let diskonPerItem = totalQty >= 12 ? 1000 : 0;

      const hargaAkhir = Math.max(0, basePrice - diskonPerItem);
      r.cells[2].textContent = `Rp ${formatCurrency(basePrice)}`;
      r.cells[3].textContent = `Rp ${formatCurrency(diskonPerItem)}`;
      r.cells[4].textContent = `Rp ${formatCurrency(hargaAkhir)}`;
      r.cells[5].textContent = `Rp ${formatCurrency(hargaAkhir * qty)}`;
    });

    updateTotal();
  }

  /* ---------------- Update Total ---------------- */
  function updateTotal() {
    let total = 0;
    itemsTableBody.querySelectorAll('tr').forEach(row => {
      const subtotalText = row.cells[5]?.textContent || '';
      total += parseCurrencyToNumber(subtotalText);
    });
    currentTotal = total;
    if (totalAmountElem) totalAmountElem.textContent = formatCurrency(total);
    updateChange();
    updateQtySummary();
    updateTotalDiscount();
  }

  function updateChange() {
    const paid = parseCurrencyToNumber(paidAmountInput?.value || 0);
    const change = paid - currentTotal;
    if (changeAmountElem) changeAmountElem.textContent = formatCurrency(change);
  }

  if (paidAmountInput) paidAmountInput.addEventListener('input', updateChange);

  /* ---------------- Tombol Tambah Item ---------------- */
  addItemBtn.addEventListener('click', () => {
    const selectedCode = productType.value;
    const selectedProduct = products.find(p => p.kode === selectedCode);
    if (!selectedProduct) return alert('Pilih produk terlebih dahulu!');

    const warna = productColor.value || '-';
    const size = productSize.value || '-';
    const qty = parseFloat(itemQtyInput.value) || 0;
    const harga = parseFloat(itemPriceInput.value) || 0;

    if (qty <= 0 || harga <= 0) {
      alert('Masukkan jumlah dan harga yang valid!');
      return;
    }

    const tr = document.createElement('tr');
    tr.setAttribute('data-kode', selectedProduct.kode);
    tr.setAttribute('data-qty', qty);
    tr.setAttribute('data-baseprice', harga);

    const hargaAkhir = harga;
    tr.innerHTML = `
      <td>${selectedProduct.nama}  ${warna}  ${size}</td>
      <td>${qty}</td>
      <td>Rp ${formatCurrency(harga)}</td>
      <td>Rp 0</td>
      <td>Rp ${formatCurrency(hargaAkhir)}</td>
      <td>Rp ${formatCurrency(hargaAkhir * qty)}</td>
      <td><button class="delete-btn">Hapus</button></td>
    `;

    itemsTableBody.appendChild(tr);

    tr.querySelector('.delete-btn').addEventListener('click', () => {
      tr.remove();
      updateTotal();
    });

    itemQtyInput.value = '';
    itemPriceInput.value = '';

    updateTotal();

    if (selectedProduct.kode === 'SBLN') applySablonDiscount();
    else applyBajuDiscount(selectedProduct.kode);
  });

  /* ---------------- Export PDF ---------------- */
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function () {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40, lineHeight = 18;
      let y = 50;

      doc.setFontSize(18).setFont('helvetica', 'bold');
      doc.text('INVOICE PEMBAYARAN', margin, y);

      const img = new Image();
      img.src = 'gambar/logoitem.png';
      img.onload = generatePDF;
      img.onerror = generatePDF;

      function generatePDF() {
        try { if (img.complete) doc.addImage(img, 'PNG', 450, 20, 80, 60); } catch {}
        try {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.08 }));
          doc.setFontSize(100);
          doc.setTextColor(150);
          doc.text('ESTAFOLD', 150, 400, { angle: 45 });
          doc.restoreGraphicsState();
        } catch (e) {}

        y += 40;
        const total = currentTotal;
        const paid = parseCurrencyToNumber(paidAmountInput?.value || 0);
        const { totalBaju, totalSablon } = updateQtySummary();
        const totalDiskonSemua = updateTotalDiscount(); // ✅ tambahkan baris ini
        const validationCode = generateValidationCode(paymentIDElem?.textContent || '', total);

        doc.setFontSize(9).setFont('helvetica', 'normal');
        doc.text(`Invoice ID: ${paymentIDElem?.textContent || ''}`, margin, y); y += lineHeight;
        doc.text(`Tanggal: ${invoiceDateElem?.textContent || ''}`, margin, y); y += lineHeight;
        doc.text(`Nama Pembeli: ${buyerNameInput?.value || ''}`, margin, y); y += lineHeight;
        doc.text(`No HP: ${buyerPhoneInput?.value || ''}`, margin, y); y += lineHeight + 6;

        // … (lanjutan tabel, total, catatan tetap sama seperti versi kamu)
        // Header tabel
        doc.setFont('helvetica', 'bold');
        const headers = ['No', 'Nama Produk', 'Harga Asli', 'Jumlah', 'Diskon', 'Harga Akhir', 'Subtotal'];
        const colWidths = [30, 140, 80, 40, 70, 80, 90];
        const colPositions = [];
        let pos = margin;
        colWidths.forEach(w => { colPositions.push(pos); pos += w; });

        headers.forEach((h, i) => {
          if (i <= 1) doc.text(h, colPositions[i] + 2, y);
          else doc.text(h, colPositions[i] + colWidths[i] - 2, y, { align: 'right' });
        });

        y += lineHeight;
        doc.line(margin, y - 10, margin + colWidths.reduce((a, b) => a + b), y - 10);

        doc.setFont('helvetica', 'normal');
        let no = 1;
        itemsTableBody.querySelectorAll('tr').forEach(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length < 6) return;
          doc.text(String(no), colPositions[0] + 2, y);
          const productName = doc.splitTextToSize(cols[0].textContent, colWidths[1] - 5);
          doc.text(productName, colPositions[1] + 2, y);
          doc.text(cols[2].textContent.replace(/Rp\s*/, '').trim(), colPositions[2] + colWidths[2] - 2, y, { align: 'right' });
          doc.text(cols[1].textContent, colPositions[3] + colWidths[3] - 2, y, { align: 'right' });
          doc.text(cols[3].textContent.replace(/Rp\s*/, '').trim(), colPositions[4] + colWidths[4] - 2, y, { align: 'right' });
          doc.text(cols[4].textContent.replace(/Rp\s*/, '').trim(), colPositions[5] + colWidths[5] - 2, y, { align: 'right' });
          doc.text(cols[5].textContent.replace(/Rp\s*/, '').trim(), colPositions[6] + colWidths[6] - 2, y, { align: 'right' });
          y += lineHeight;
          no++;
        });

        y += 10;
        doc.line(margin, y, margin + colWidths.reduce((a, b) => a + b), y);
        y += 20;

        doc.setFont('helvetica', 'bold');
        doc.text(`Total Baju : ${totalBaju} pcs`, margin, y);
        doc.text(`Total Sablon : ${totalSablon} pcs`, margin + 100, y);
        doc.text(`Total Diskon : Rp ${formatCurrency(totalDiskonSemua)}`, 550, y, { align: 'right' }); y += lineHeight;
        doc.text(`Total: Rp ${formatCurrency(total)}`, 550, y, { align: 'right' }); y += lineHeight;
        doc.text(`Uang Dibayar: Rp ${formatCurrency(paid)}`, 550, y, { align: 'right' }); y += lineHeight;
        doc.text(`Kembalian: Rp ${formatCurrency(paid - total)}`, 550, y, { align: 'right' }); y += lineHeight + 10;

        doc.setFont('helvetica', 'italic');
        doc.text('Terima kasih telah berbelanja di Estafold', 380, y, { align: 'right' }); y += lineHeight + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Catatan:', margin, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        const notes = [
          "* Untuk Jenis sablon DTF design dibawah 2 mm atau gradasi terlalu tipis ada kemungkinan tidak tercetak.",
          "* Warna sablon tidak bisa sama persis dgn warna yg di layar, hanya bisa mengikuti 80% dari warna design.",
          "* Khusus Sablon, Batas retur 3 hari setelah pengambilan barang, dengan syarat barang masih baru.",
          "* Dengan dilakukannya pembayaran atas invoice ini, maka customer telah menyepakati semua ketentuan di atas.",
          "* Jika terjadi kesalahan ketika barang diterima, maka invoice ini yang akan menjadi acuan kami.",
          "* Pembayaran hanya melalui rekening BCA A/N DIMAS NUUR ALFATH 0050722481",
          "* Barang yang sudah dibeli tidak dapat dikembalikan."
        ];
        notes.forEach(note => {
          const splitNote = doc.splitTextToSize(note, 500);
          doc.text(splitNote, margin, y);
          y += splitNote.length * lineHeight;
        });


        y += 10;
        doc.text(`Kode Validasi: ${validationCode}`, margin, y);
        doc.save(`Estafold-${paymentIDElem ? paymentIDElem.textContent : 'INV'}.pdf`);
      }
    });
  }

  updateTotal();
})();
