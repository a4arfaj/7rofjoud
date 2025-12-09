export const toArabicNumerals = (num: string | number | null | undefined): string => {
  if (num === null || num === undefined) return '';
  const value = typeof num === 'number' ? num.toString() : num;
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return value
    .split('')
    .map((char) => {
      const digit = parseInt(char, 10);
      return Number.isNaN(digit) ? char : arabicNumerals[digit];
    })
    .join('');
};

export const toEnglishDigits = (value: string): string => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return value.replace(/[٠-٩]/g, (d) => '0123456789'[arabicDigits.indexOf(d)]);
};
