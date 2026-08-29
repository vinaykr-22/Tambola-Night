import type { Ticket } from "@tambola/shared";
const rangeForColumn = (column: number): [number, number] => column === 0 ? [1, 9] : column === 8 ? [80, 90] : [column * 10, column * 10 + 9];
const shuffle = <T>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
/** Creates a 3x9 ticket with five ascending numbers in every row. */
export function generateTicket(): Ticket {
  const cells: Ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  const rows = Array.from({ length: 3 }, () => shuffle([...Array(9).keys()]).slice(0, 5));
  const counts = Array(9).fill(0); rows.flat().forEach((column) => counts[column]++);
  for (let column = 0; column < 9; column++) if (!counts[column]) { const donor = counts.findIndex((count) => count > 1); const row = rows.findIndex((columns) => columns.includes(donor) && !columns.includes(column)); rows[row][rows[row].indexOf(donor)] = column; counts[donor]--; counts[column]++; }
  for (let column = 0; column < 9; column++) { const [min, max] = rangeForColumn(column); const values = shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i)).slice(0, counts[column]).sort((a, b) => a - b); let index = 0; rows.forEach((columns, row) => { if (columns.includes(column)) cells[row][column] = values[index++]; }); }
  return cells;
}
