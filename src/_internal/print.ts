// Prints a line in the console and on the page. You do not need to modify this file.
export function print(line: string): void {
  console.log(line)
  if (typeof document === 'undefined') return
  const item = document.createElement('li')
  item.textContent = line
  document.querySelector('#output')?.append(item)
}
