// script.js
// Fitur utama:
// - Harga sablon berdasarkan size
// - Diskon sablon: qty > 12 pcs => -1000/item
// - Diskon baju: 24–47 pcs total => -1000/item, >=48 pcs total => -2000/item
// - Tabel tampil Harga Asli, Diskon, Harga Akhir, Subtotal live
// - Export PDF manual, No & Nama kiri; angka kanan

(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
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
    if (str === undefined || str === null) return 0;
    if (typeof str === 'number') return str;
    let s = String(str).trim();
    if (s === '') return 0;
    s = s.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.\-]+/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /* ---------------- DOM refs ---------------- */
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

  /* ---------------- Diskon Baju Helper (2 tier) ---------------- */
  function applyBajuDiscount(kode) {
    const rows = Array.from(itemsTableBody.querySelectorAll('tr'))
      .filter(r => r.getAttribute('data-kode') === kode);

    let totalQty = 0;
    rows.forEach(r => {
      totalQty += parseFloat(r.getAttribute('data-qty') || 0);
    });

    rows.forEach(r => {
      const basePrice = parseFloat(r.getAttribute('data-baseprice') || 0);
      const qty = parseFloat(r.getAttribute('data-qty') || 0);

      // --- logika 2 tier ---
      let diskonPerItem = 0;
      if (totalQty >= 48) {
        diskonPerItem = 2000;
      } else if (totalQty >= 24) {
        diskonPerItem = 1000;
      }

      const hargaAkhir = Math.max(0, basePrice - diskonPerItem);

      r.cells[2].textContent = `Rp ${formatCurrency(basePrice)}`;
      r.cells[3].textContent = `Rp ${formatCurrency(diskonPerItem) + "/pcs"}`;
      r.cells[4].textContent = `Rp ${formatCurrency(hargaAkhir)}`;
      r.cells[5].textContent = `Rp ${formatCurrency(hargaAkhir * qty)}`;
    });

    updateTotal();
  }

  /* ---------------- products dropdown ---------------- */
  if (typeof products === 'undefined') {
    console.error('Products array belum didefinisikan!');
    return;
  }

  if (productType) {
    products.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.kode;
      opt.textContent = `${p.nama}${(p.harga || p.harga === 0) ? ' - Rp ' + formatCurrency(p.harga) : ''}`;
      productType.appendChild(opt);
    });

    productType.addEventListener('change', function () {
      productColor.innerHTML = '<option value="">Pilih Warna</option>';
      productSize.innerHTML = '<option value="">Pilih Ukuran</option>';
      itemPriceInput.value = '';

      const selected = products.find(p => p.kode === this.value);
      if (selected) {
        if (Array.isArray(selected.warna) && selected.warna.length > 0) {
          selected.warna.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.textContent = w;
            productColor.appendChild(opt);
          });
        } else {
          productColor.innerHTML = '<option value="-">-</option>';
        }

        if (Array.isArray(selected.size) && selected.size.length > 0) {
          if (typeof selected.size[0] === 'string') {
            selected.size.forEach(s => {
              const opt = document.createElement('option');
              opt.value = s;
              opt.textContent = s;
              productSize.appendChild(opt);
            });
            if (selected.harga || selected.harga === 0) {
              itemPriceInput.value = selected.harga;
            }
          } else {
            selected.size.forEach(s => {
              const opt = document.createElement('option');
              opt.value = s.nama;
              opt.textContent = s.nama;
              opt.dataset.harga = s.harga;
              productSize.appendChild(opt);
            });
            itemPriceInput.value = '';
          }
        } else {
          productSize.innerHTML = '<option value="-">-</option>';
        }
      }
    });

    productSize.addEventListener('change', function () {
      const sizeOption = this.options[this.selectedIndex];
      if (sizeOption && sizeOption.dataset.harga) {
        itemPriceInput.value = sizeOption.dataset.harga;
      }
    });
  }

  /* ---------------- total & change ---------------- */
  function updateTotal() {
    let total = 0;
    itemsTableBody.querySelectorAll('tr').forEach(row => {
      const subtotalText = row.cells[5] ? row.cells[5].textContent : '';
      total += parseCurrencyToNumber(subtotalText);
    });
    currentTotal = total;
    if (totalAmountElem) totalAmountElem.textContent = formatCurrency(total);
    updateChange();
  }

  function updateChange() {
    const paid = paidAmountInput ? parseCurrencyToNumber(paidAmountInput.value) : 0;
    const change = paid - currentTotal;
    if (changeAmountElem) changeAmountElem.textContent = formatCurrency(change);
  }

  if (paidAmountInput) paidAmountInput.addEventListener('input', updateChange);

  /* ---------------- add item ---------------- */
  if (addItemBtn) {
    addItemBtn.addEventListener('click', function () {
      const kode = productType.value;
      const warna = productColor.value || '-';
      const sizeOption = productSize.options[productSize.selectedIndex];
      const sizeText = sizeOption ? sizeOption.textContent : '';
      const qty = parseFloat(itemQtyInput.value) || 0;
      let price = parseCurrencyToNumber(itemPriceInput.value);

      if (!kode || !sizeOption || qty <= 0) {
        alert('Mohon pilih produk, ukuran & jumlah!');
        return;
      }

      const produk = products.find(p => p.kode === kode);
      if (!produk) return;

      if (!price || price <= 0) {
        if (Array.isArray(produk.size) && typeof produk.size[0] === 'string') {
          price = produk.harga || 0;
        } else {
          price = parseCurrencyToNumber(sizeOption.dataset.harga);
        }
      }

      let diskonPerItem = 0;
      if (produk.kode === 'SBLN' && qty > 12) diskonPerItem = 1000;

      const hargaAkhir = price - diskonPerItem;
      const subtotal = qty * hargaAkhir;

      const row = document.createElement('tr');
      row.setAttribute('data-kode', produk.kode);
      row.setAttribute('data-qty', qty);
      row.setAttribute('data-baseprice', price);

      row.innerHTML = `
        <td>${produk.nama}${warna && warna !== '-' ? ' - ' + warna : ''}${sizeText ? ' - ' + sizeText : ''}</td>
        <td>${qty}</td>
        <td>Rp ${formatCurrency(price)}</td>
        <td>Rp ${formatCurrency(diskonPerItem) + "/pcs"}</td>
        <td>Rp ${formatCurrency(hargaAkhir)}</td>
        <td>Rp ${formatCurrency(subtotal)}</td>
        <td><button class="delete-btn">Hapus</button></td>
      `;
      itemsTableBody.appendChild(row);

      row.querySelector('.delete-btn').addEventListener('click', function () {
        const kodeProduk = row.getAttribute('data-kode');
        row.remove();
        updateTotal();
        if (kodeProduk !== 'SBLN') applyBajuDiscount(kodeProduk);
      });

      updateTotal();
      if (produk.kode !== 'SBLN') applyBajuDiscount(produk.kode);

      productType.value = '';
      productColor.innerHTML = '<option value="">Pilih Warna</option>';
      productSize.innerHTML = '<option value="">Pilih Ukuran</option>';
      itemQtyInput.value = '';
      itemPriceInput.value = '';
    });
  }

  /* ---------------- export PDF ---------------- */
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', function () {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('Library jsPDF belum termuat. Pastikan CDN jsPDF ada di index.html');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'pt', 'a4');
      const margin = 40;
      let y = 50;
      const lineHeight = 18;

      doc.setFontSize(18).setFont('helvetica', 'bold');
      doc.text('INVOICE PEMBAYARAN', margin, y);

      const img = new Image();
      img.src = 'gambar/logoitem.png';
      img.onload = generatePDF;
      img.onerror = generatePDF;

      function generatePDF() {
        try { if (img.complete) doc.addImage(img, 'PNG', 450, 20, 80, 60); } catch {}
        y += 40;

        const total = currentTotal;
        const paid = parseCurrencyToNumber(paidAmountInput ? paidAmountInput.value : 0);

        doc.setFontSize(9).setFont('helvetica', 'normal');
        doc.text(`Invoice ID: ${paymentIDElem?.textContent || ''}`, margin, y); y += lineHeight;
        doc.text(`Tanggal: ${invoiceDateElem?.textContent || ''}`, margin, y); y += lineHeight;
        doc.text(`Nama Pembeli: ${buyerNameInput?.value || ''}`, margin, y); y += lineHeight;
        doc.text(`No HP: ${buyerPhoneInput?.value || ''}`, margin, y); y += lineHeight + 6;

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

        // Isi tabel
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
          if (y > 750) { doc.addPage(); y = 50; }
        });

        y += 10;
        doc.line(margin, y, margin + colWidths.reduce((a, b) => a + b), y);
        y += 20;

        doc.setFont('helvetica', 'bold');
        doc.text(`Total: Rp ${formatCurrency(total)}`, 550, y, { align: 'right' }); y += lineHeight;
        doc.text(`Uang Dibayar: Rp ${formatCurrency(paid)}`, 550, y, { align: 'right' }); y += lineHeight;
        doc.text(`Kembalian: Rp ${formatCurrency(paid - total)}`, 550, y, { align: 'right' }); y += lineHeight + 10;

        doc.setFont('helvetica', 'italic');
        doc.text('Terima kasih telah berbelanja di Estafold', 350, y, { align: 'right' });
        y += lineHeight + 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Catatan:', margin, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
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

        doc.save(`Estafold-${paymentIDElem ? paymentIDElem.textContent : 'INV'}.pdf`);
      }
    });
  }

  updateTotal();
})();
