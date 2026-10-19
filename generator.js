const form = document.querySelector('#generator-form');
const description = document.querySelector('#description');
const output = document.querySelector('#prompt-output');
const status = document.querySelector('#status');
const copyStatus = document.querySelector('#copy-status');

description.addEventListener('input', () => {
  document.querySelector('#count').textContent = description.value.length;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const details = description.value.trim();
  if (!details) { status.textContent = 'Please describe your SERPZ first.'; return; }
  output.value = `Create an original SERPZ gang character: a charismatic anthropomorphic cobra with detailed scales and expressive eyes. Make it a cinematic, detailed 3D animated character portrait with a western outlaw atmosphere, dramatic lighting, and richly textured clothing. Show one character centered in a square image. Do not add words, letters, logos, or watermarks.\n\nMy character: ${details}`;
  document.querySelector('#prompt-result').hidden = false;
  copyStatus.textContent = '';
  status.textContent = 'Your prompt is ready. Copy it and open ChatGPT to create your image.';
});
document.querySelector('#copy-prompt').addEventListener('click', async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(output.value);
    copyStatus.textContent = 'Prompt copied! Open ChatGPT and paste it into a new message.';
  } catch {
    output.focus(); output.select();
    copyStatus.textContent = 'Select and copy the prompt above, then paste it into ChatGPT.';
  }
});
