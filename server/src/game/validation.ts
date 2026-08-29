import type { Ticket, WinningCondition } from "@tambola/shared";
const numbers = (cells: (number | null)[]) => cells.filter((cell): cell is number => cell !== null);
const called = (values: number[], marked: Set<number>) => values.every((number) => marked.has(number));
export function isWinningTicket(ticket: Ticket, calledNumbers: number[], condition: WinningCondition): boolean {
  const marked = new Set(calledNumbers), all = ticket.flatMap(numbers);
  if (condition === "earlyFive") return all.filter((number) => marked.has(number)).length >= 5;
  if (condition === "fullHouse") return called(all, marked);
  if (condition === "fourCorners") return called([numbers(ticket[0])[0], numbers(ticket[0]).at(-1)!, numbers(ticket[2])[0], numbers(ticket[2]).at(-1)!], marked);
  return called(numbers(ticket[condition === "topLine" ? 0 : condition === "middleLine" ? 1 : 2]), marked);
}
