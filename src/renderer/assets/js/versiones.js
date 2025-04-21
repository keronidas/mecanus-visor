const HID = require('node-hid');

// Listamos todos los dispositivos HID conectados
const devices = HID.devices();

// Filtramos posibles gamepads por nombre o uso
const gamepads = devices.filter(device => {
  const name = (device.product || '').toLowerCase();
  return name.includes('gamepad') || name.includes('joystick') || name.includes('xbox') || name.includes('playstation');
});

// Mostramos los datos
console.log(`🎮 Gamepads detectados: ${gamepads.length}\n`);

gamepads.forEach((device, index) => {
  console.log(`--- Gamepad ${index + 1} ---`);
  console.log(`🔹 Vendor ID     : ${device.vendorId}`);
  console.log(`🔸 Product ID    : ${device.productId}`);
  console.log(`🏷️  Nombre        : ${device.product}`);
  console.log(`🏭 Fabricante     : ${device.manufacturer}`);
  console.log(`🧬 Versión (Release): ${device.release}`);
  console.log(`🧾 Serial Number  : ${device.serialNumber || 'N/A'}`);
  console.log(`📦 Interface      : ${device.interface || 'N/A'}`);
  console.log(`📚 Usage Page     : ${device.usagePage || 'N/A'}`);
  console.log();
});
