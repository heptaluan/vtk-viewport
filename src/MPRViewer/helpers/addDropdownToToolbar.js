export default function addDropDownToToolbar({
  options,
  onSelectedValueChange,
}) {
  const { values, defaultValue } = options;
  const toolbar = document.getElementById('demo-toolbar');
  const select = document.createElement('select');

  values.forEach((value) => {
    const optionElement = document.createElement('option');

    optionElement.value = String(value);
    optionElement.innerText = String(value);

    if (value === defaultValue) {
      optionElement.selected = true;
    }

    select.append(optionElement);
  });

  select.onchange = (evt) => {
    const selectElement = evt.target;

    if (selectElement) {
      onSelectedValueChange(selectElement.value);
    }
  };

  toolbar.append(select);
}
