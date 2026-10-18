// ─────────────── Universal Export Helpers ───────────────
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { label: string; key: string }[],
  filename: string,
) {
  const headerLabels = headers.map((h) => h.label);
  const rows = [headerLabels];

  data.forEach((item) => {
    rows.push(
      headers.map((h) => {
        let val = item[h.key];
        if (h.key.includes(".")) {
          const parts = h.key.split(".");
          val = parts.reduce<unknown>(
            (acc, part) => (acc as Record<string, unknown>)?.[part],
            item as unknown,
          );
        }
        return String(val ?? "");
      }),
    );
  });

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  headers: { label: string; key: string }[],
  title: string,
  filename: string,
) {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-xml-soap:office:office" xmlns:x="urn:schemas-microsoft-xml-soap:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; font-family: sans-serif; font-size: 11pt; }
        th { background-color: #2563eb; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
        td { border: 1px solid #cbd5e1; padding: 8px; }
        h2 { color: #1e293b; margin-bottom: 2px; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p>Sana: ${new Date().toLocaleString("uz-UZ")}</p>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (item) => `
            <tr>
              ${headers
                .map((h) => {
                  let val = item[h.key];
                  if (h.key.includes(".")) {
                    const parts = h.key.split(".");
                    val = parts.reduce<unknown>(
                      (acc, part) => (acc as Record<string, unknown>)?.[part],
                      item as unknown,
                    );
                  }
                  return `<td>${val ?? ""}</td>`;
                })
                .join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
