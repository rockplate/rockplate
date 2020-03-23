import { Builder } from '../src/Builder';

export const template = `
Dear [customer name],

Thank you for your order. Your items will be shipped soon:

[--
this is a comment
that should be removed
--]

[repeat items]

  [item name]: [item price]

  [if discount is available] [-- this is a comment too --]
      (Discount: [discount value])
  [else]
      (No Discount)
  [end if]

[end repeat]

Total: [order total]

Thanks
[brand name]
`;

(Object.prototype as any).dummyVariableToFailHasOwnPropertyCheck = 'hello'; // to fail .hasOwnProperty check

export const schema = {
  brand: {
    name: 'My Brand',
  },
  customer: {
    name: 'Customer Name',
  },
  items: [
    {
      item: {
        name: 'Item 1',
        price: '$100',
      },
      discount: {
        available: true,
        value: '5%',
      },
    },
    {
      item: {
        name: 'Item 2',
        price: '$85',
      },
      discount: {
        available: false,
        amount: 0,
      },
    },
  ],
  order: {
    paid: true,
    total: '$185',
  },
};

export const parsed = `
Dear Customer Name,

Thank you for your order. Your items will be shipped soon:

{--[--
this is a comment
that should be removed
--]--}

{--[repeat items]--}

  Item 1: $100

  {--[if discount is available]--} {--[-- this is a comment too --]--}
      (Discount: 5%)
  {--[else]
      (No Discount)
  [end if]--}



  Item 2: $85

  {--[if discount is available] [-- this is a comment too --]
      (Discount: [discount value])
  [else]--}
      (No Discount)
  {--[end if]--}

{--[end repeat]--}

Total: $185

Thanks
My Brand
`.replace(/\{\-\-.+?\-\-\}/gs, '');

export const getBuilders = <T = any>(tpl: string, sch: T, testStrictOverride?: boolean): Builder<T>[] => {
  return [new Builder<T>(tpl, sch), new Builder<T>(tpl)].concat(
    testStrictOverride ? [new Builder<T>(tpl, sch, true), new Builder(tpl, sch, false)] : [],
  );
};
