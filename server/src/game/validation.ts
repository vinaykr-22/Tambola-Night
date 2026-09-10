import type { Ticket, WinningCondition } from "@tambola/shared";

const numbers = (cells: (number | null)[]) =>
  cells.filter((cell): cell is number => cell !== null);

const called = (values: number[], marked: Set<number>) =>
  values.every((number) => marked.has(number));

export function isWinningTicket(
  ticket: Ticket,
  calledNumbers: number[],
  condition: WinningCondition
): boolean {
  const marked = new Set(calledNumbers);
  const all = ticket.flatMap(numbers);

  if (condition === "earlyFive") return all.filter((n) => marked.has(n)).length >= 5;
  if (condition === "earlySeven") return all.filter((n) => marked.has(n)).length >= 7;
  if (condition === "fullHouse" || condition === "secondFullHouse") return called(all, marked);

  const corners = [
    numbers(ticket[0])[0],
    numbers(ticket[0]).at(-1)!,
    numbers(ticket[2])[0],
    numbers(ticket[2]).at(-1)!,
  ];

  if (condition === "fourCorners") return called(corners, marked);
  if (condition === "star") {
    const centerNumber = numbers(ticket[1])[2]; // 3rd of 5 numbers in middle row
    return called([...corners, centerNumber], marked);
  }

  return called(
    numbers(ticket[condition === "topLine" ? 0 : condition === "middleLine" ? 1 : 2]),
    marked
  );
}
