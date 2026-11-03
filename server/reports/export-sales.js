import PDFDocument from 'pdfkit';
import writeExcelFile from 'write-excel-file/node';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';

const code = (id) => 'BV-' + String(id).padStart(4, '0');
const money = (value) =>
  'Rp ' + Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const periodLabel = (report) => `${report.from} - ${report.to}`;
const navy = '#183e67';

export function salesPdf(report, store, response) {
  const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });
  doc.pipe(response);
  const left = 44,
    width = 507;
  function header(y) {
    doc.roundedRect(left, y, width, 28, 4).fill(navy);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    for (const [label, x, w, align] of [
      ['Pesanan', 52, 70, 'left'],
      ['Tanggal', 125, 78, 'left'],
      ['Atas nama', 208, 180, 'left'],
      ['Total (Rp)', 395, 148, 'right'],
    ])
      doc.text(label, x, y + 9, { width: w, align });
    return y + 28;
  }
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(23).text(store.name, left, 40, { width });
  doc
    .fillColor('#6a8cab')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('LAPORAN PENJUALAN', left, 73, { width });
  doc
    .fillColor('#718aa1')
    .font('Helvetica')
    .fontSize(9)
    .text('Periode ' + periodLabel(report), left, 92, { width });
  let y = 109;
  if (report.filterLabel) {
    doc.text(report.filterLabel, left, y, { width, lineGap: 3 });
    y = doc.y + 9;
  }
  doc
    .fillColor('#8c9fb0')
    .fontSize(8)
    .text(
      'Dicetak ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
      left,
      y,
      { width },
    );
  y = doc.y + 14;
  const cardY = y;
  doc.roundedRect(left, cardY, 330, 51, 7).fill('#eaf1fb');
  doc.roundedRect(left + 340, cardY, 167, 51, 7).fill('#eaf5f1');
  doc
    .fillColor('#7390aa')
    .font('Helvetica')
    .fontSize(8)
    .text('TOTAL PENJUALAN', left + 12, cardY + 10, { width: 306 });
  doc
    .fillColor(navy)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(money(report.total), left + 12, cardY + 25, { width: 306 });
  doc
    .fillColor('#719b8e')
    .font('Helvetica')
    .fontSize(8)
    .text('TRANSAKSI SELESAI', left + 352, cardY + 10, { width: 143 });
  doc
    .fillColor('#467e6e')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(String(report.count), left + 352, cardY + 25, { width: 143 });
  y = header(cardY + 65);
  for (let index = 0; index < report.rows.length; index++) {
    const row = report.rows[index];
    doc.font('Helvetica').fontSize(9);
    const rowHeight = Math.max(39, doc.heightOfString(row.customer_name, { width: 179 }) + 24);
    if (y + rowHeight > 733) {
      doc.addPage();
      doc
        .fillColor(navy)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(store.name + ' - Lanjutan', left, 40, { width });
      doc
        .fillColor('#7f96a9')
        .font('Helvetica')
        .fontSize(8)
        .text('Periode ' + periodLabel(report), left, 59, { width });
      y = header(78);
    }
    if (index % 2 === 0) doc.rect(left, y, width, rowHeight).fill('#f3f7fc');
    doc
      .fillColor('#355b7d')
      .font('Helvetica')
      .fontSize(9)
      .text(code(row.order_id), 52, y + 10, { width: 70 })
      .text(String(row.sale_date).slice(0, 10), 125, y + 10, { width: 78 })
      .text(row.customer_name, 208, y + 8, { width: 179 });
    const nameBottom = doc.y;
    doc
      .fillColor('#91a4b5')
      .fontSize(7)
      .text(row.phone_number, 208, nameBottom + 3, { width: 179 });
    doc
      .fillColor('#315b82')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(money(row.total_sale), 395, y + 10, { width: 148, align: 'right' });
    y += rowHeight;
  }
  if (!report.rows.length) {
    doc
      .fillColor('#8097aa')
      .font('Helvetica')
      .fontSize(10)
      .text('Tidak ada penjualan pada periode dan filter ini.', left, y + 18, { width });
    y += 55;
  }
  if (y + 75 > 733) {
    doc.addPage();
    y = 50;
  }
  doc
    .moveTo(left, y + 12)
    .lineTo(left + width, y + 12)
    .strokeColor('#d9e5f1')
    .stroke();
  doc
    .fillColor(navy)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Jumlah transaksi: ' + report.count, left, y + 27, { width });
  doc.text('Total penjualan: ' + money(report.total), left, y + 45, { width, align: 'right' });
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#96a8b7')
      .text('Bien Vendre - Dokumen internal', left, 770, { lineBreak: false })
      .text(`${page + 1} / ${range.count}`, 480, 770, {
        width: 71,
        align: 'right',
        lineBreak: false,
      });
  }
  doc.end();
}

export async function salesExcel(report, store) {
  const cell = (value, style = {}) => ({
    value,
    type: typeof value === 'number' ? Number : value instanceof Date ? Date : String,
    ...style,
  });
  const title = (value) => [
    cell(value, { columnSpan: 6, fontSize: 18, fontWeight: 'bold', textColor: navy, height: 33 }),
    null,
    null,
    null,
    null,
    null,
  ];
  const note = (value, height = 24) => [
    cell(value, { columnSpan: 6, fontSize: 10, textColor: '#7c95ab', wrap: true, height }),
    null,
    null,
    null,
    null,
    null,
  ];
  const amountFormat = '"Rp" #,##0.00';
  const metric = (label, value, amount = false) => [
    cell(label, {
      columnSpan: 3,
      fontWeight: 'bold',
      textColor: '#547b9f',
      backgroundColor: '#edf4fc',
      height: 30,
    }),
    null,
    null,
    cell(value, {
      columnSpan: 3,
      fontWeight: 'bold',
      textColor: navy,
      format: amount ? amountFormat : '#,##0',
      align: 'right',
      backgroundColor: '#edf4fc',
    }),
    null,
    null,
  ];
  const summary = [
    title(store.name),
    note('RINGKASAN PENJUALAN'),
    note('Periode ' + periodLabel(report)),
    [],
    metric('Total penjualan', report.total, true),
    metric('Transaksi selesai', report.count),
    metric('Rata-rata per transaksi', report.average, true),
    metric('Pemesan unik', report.customers),
    [],
    note(report.filterLabel || 'Semua transaksi selesai pada periode ini.', 36),
    note(
      'Sumber: data pesanan selesai dalam sistem. Tanggal mengikuti tanggal penjualan, zona waktu Asia/Jakarta.',
      36,
    ),
  ];
  const headers = [
    'No.',
    'Pesanan',
    'Tanggal penjualan',
    'Atas nama',
    'Nomor telepon',
    'Total penjualan',
  ];
  const rows = [
    title(store.name),
    note('RIWAYAT PENJUALAN'),
    note('Periode ' + periodLabel(report)),
    note(report.filterLabel || 'Hanya transaksi yang sudah selesai.', 30),
    [],
    headers.map((value) =>
      cell(value, {
        fontWeight: 'bold',
        textColor: '#ffffff',
        backgroundColor: navy,
        height: 28,
        alignVertical: 'center',
      }),
    ),
    ...report.rows.map((row, index) => {
      const style = {
        backgroundColor: index % 2 === 0 ? '#f0f5fc' : '#ffffff',
        textColor: '#406787',
        height: Math.max(24, Math.ceil(row.customer_name.length / 31) * 15 + 7),
        alignVertical: 'center',
        bottomBorderColor: '#e2ebf4',
        bottomBorderStyle: 'hair',
      };
      return [
        cell(index + 1, { ...style, align: 'center' }),
        cell(code(row.order_id), style),
        cell(new Date(String(row.sale_date).slice(0, 10) + 'T00:00:00Z'), {
          ...style,
          format: 'dd mmm yyyy',
        }),
        cell(row.customer_name, { ...style, wrap: true }),
        cell(row.phone_number, { ...style, format: '@' }),
        cell(Number(row.total_sale), {
          ...style,
          format: amountFormat,
          align: 'right',
          fontWeight: 'bold',
        }),
      ];
    }),
    [
      cell('TOTAL', {
        columnSpan: 5,
        fontWeight: 'bold',
        textColor: navy,
        backgroundColor: '#e4eefb',
        height: 29,
      }),
      null,
      null,
      null,
      null,
      cell(report.total, {
        fontWeight: 'bold',
        textColor: navy,
        backgroundColor: '#e4eefb',
        format: amountFormat,
        align: 'right',
      }),
    ],
  ];
  const columns = [
    { width: 7 },
    { width: 18 },
    { width: 20 },
    { width: 34 },
    { width: 22 },
    { width: 24 },
  ];
  const buffer = await writeExcelFile(
    [
      { sheet: 'Ringkasan', data: summary, columns, showGridLines: false },
      {
        sheet: 'Riwayat',
        data: rows,
        columns,
        stickyRowsCount: 6,
        showGridLines: false,
        orientation: 'landscape',
      },
    ],
    { fontFamily: 'Calibri', fontSize: 11 },
  ).toBuffer();
  const archive = unzipSync(new Uint8Array(buffer));
  const sheetPath = 'xl/worksheets/sheet2.xml';
  const sheet = strFromU8(archive[sheetPath]);
  archive[sheetPath] = strToU8(
    sheet.replace(
      '</sheetData>',
      `</sheetData><autoFilter ref="A6:F${Math.max(6, 6 + report.rows.length)}"/>`,
    ),
  );
  return Buffer.from(zipSync(archive, { level: 6 }));
}
