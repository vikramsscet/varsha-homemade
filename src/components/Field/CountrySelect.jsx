import Field from './Field';
import { COUNTRIES } from '../../data/countries';

// Values are country names; an existing value outside the list (e.g. from the API) is kept.
export default function CountrySelect({ value, ...props }) {
  const options = value && !COUNTRIES.includes(value) ? [value, ...COUNTRIES] : COUNTRIES;
  return (
    <Field as="select" label="Country/Region" required value={value} autoComplete="country-name" {...props}>
      <option value="">Select a country</option>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
    </Field>
  );
}
