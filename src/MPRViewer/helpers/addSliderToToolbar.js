export default function addSliderToToolbar({
  title,
  range,
  defaultValue,
  onSelectedValueChange,
  updateLabelOnChange,
}) {
  const toolbar = document.getElementById('demo-toolbar');
  const label = document.createElement('label');
  const input = document.createElement('input');

  label.htmlFor = title;
  label.innerText = title;

  input.type = 'range';
  input.min = String(range[0]);
  input.max = String(range[1]);
  input.value = String(defaultValue);
  input.name = title;

  input.oninput = (evt) => {
    const selectElement = evt.target;

    if (selectElement) {
      onSelectedValueChange(selectElement.value);
      if (updateLabelOnChange !== undefined) {
        updateLabelOnChange(selectElement.value, label);
      }
    }
  };
  toolbar.append(label);
  toolbar.append(input);
}
