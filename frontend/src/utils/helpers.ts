export function fixHebrewText(str: string | null | undefined): string {
  if (!str) return '---';
  // Reverse the string to undo the backend's reversal
  let reversed = str.split('').reverse().join('');
  
  // Fix parenthesis and brackets direction after reverse
  reversed = reversed.replace(/\(/g, 'TEMP_LPAREN')
                     .replace(/\)/g, '(')
                     .replace(/TEMP_LPAREN/g, ')');
                     
  reversed = reversed.replace(/\[/g, 'TEMP_LBRACK')
                     .replace(/\]/g, '[')
                     .replace(/TEMP_LBRACK/g, ']');
                     
  return reversed;
}

export function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
