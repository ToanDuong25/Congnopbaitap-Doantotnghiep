// Client-side interactions
document.addEventListener('DOMContentLoaded', () => {
  // Tự động ẩn alert sau 5 giây
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 6000);
  });

  // Hiển thị tên file đã chọn khi upload
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const fileNameDisplay = document.getElementById(input.id + '_name');
      if (fileNameDisplay && e.target.files.length > 0) {
        const file = e.target.files[0];
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        fileNameDisplay.textContent = `Đã chọn: ${file.name} (${sizeMb} MB)`;
        fileNameDisplay.classList.remove('d-none');
      }
    });
  });
});
