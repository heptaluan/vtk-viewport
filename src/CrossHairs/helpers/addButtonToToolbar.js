export default function addButtonToToolbar({
  title,
  onClick,
}) {
  const toolbar = document.getElementById('demo-toolbar');
  const button = document.createElement('button');

  button.innerHTML = title;
  button.onclick = onClick;

  toolbar.append(button);
}
