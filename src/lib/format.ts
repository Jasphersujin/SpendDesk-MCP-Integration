export const money=(n:number,c="INR")=>new Intl.NumberFormat("en-IN",{style:"currency",currency:c,maximumFractionDigits:2}).format(n);
