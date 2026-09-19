// show() と戻り値の表示。オブジェクトの配列は表に、オブジェクトは項目の一覧にする。

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

function Cell({ value }: { value: unknown }) {
  if (typeof value === "number") {
    const text = Number.isInteger(value) ? value.toLocaleString("en-US") : String(Number(value.toFixed(4)));
    return <span className="num">{text}</span>;
  }
  if (typeof value === "string") return <span>{value}</span>;
  if (typeof value === "boolean" || value === null || value === undefined) {
    return <span className="num value-literal">{String(value)}</span>;
  }
  return <code className="value-json">{JSON.stringify(value)}</code>;
}

function Table({ rows }: { rows: readonly Row[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const numeric = new Set(
    columns.filter((column) => rows.every((row) => row[column] === undefined || typeof row[column] === "number")),
  );
  return (
    <div className="table-wrap">
      <table className="value-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className={numeric.has(column) ? "cell-num" : undefined}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 表示するだけの行で、並べ替えもしない
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} className={typeof row[column] === "number" ? "cell-num" : undefined}>
                  <Cell value={row[column]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fields({ value }: { value: Row }) {
  return (
    <dl className="value-fields">
      {Object.entries(value).map(([key, field]) => (
        <div key={key} className="value-field">
          <dt>{key}</dt>
          <dd>
            {isRow(field) || Array.isArray(field) ? (
              <pre className="value-json-block">{JSON.stringify(field, null, 2)}</pre>
            ) : (
              <Cell value={field} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ValueView({ value, label }: { value: unknown; label?: string }) {
  let body: React.ReactNode;
  if (Array.isArray(value) && value.length > 0 && value.every(isRow)) body = <Table rows={value} />;
  else if (isRow(value)) body = <Fields value={value} />;
  else if (typeof value === "string") body = <p className="value-text">{value}</p>;
  else if (Array.isArray(value)) body = <pre className="value-json-block">{JSON.stringify(value, null, 2)}</pre>;
  else body = <Cell value={value} />;

  return (
    <figure className="value">
      {label && <figcaption className="value-label">{label}</figcaption>}
      {body}
    </figure>
  );
}
