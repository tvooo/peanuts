export class Alias {
  shorthand: string;
  name: string;

  constructor(shorthand: string, name: string) {
    this.shorthand = shorthand;
    this.name = name;
  }

  toString() {
    return `2020-01-01 alias ${this.shorthand} ${this.name}`;
  }

  // static fromOpenStatement(statement: string) {
  //   // Example: `2020-04-18 open dkb`
  //   const [ dateStr, chip, nameStr ] = statement.split(' ')
  //   const date = parseISO(dateStr)
  //   return new Account(nameStr, 0)
  // }
}
