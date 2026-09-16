<?php
// BỊ LỖI: Không kiểm tra xem người dùng đã gửi form hay chưa
// Nếu truy cập trực tiếp trang này, PHP sẽ báo lỗi "Undefined array key 'username'"
$username2 = $_POST['username2'];
$password2 = $_POST['password2'];

$conn = new mysqli("localhost", "root", "", "my_database");

// BỊ LỖI BẢO MẬT NGHIÊM TRỌNG (SQL Injection): 
// Nối trực tiếp dữ liệu người dùng nhập vào câu truy vấn SQL
$sql = "SELECT * FROM users WHERE username = '$username2' AND password = '$password2'";
$result = $conn->query($sql);

// BỊ LỖI LOGIC: Không kiểm tra $result có trả về dữ liệu hay không trước khi gọi num_rows
if ($result->num_rows > 0) {
    echo "Đăng nhập thành công!";
} else {
    echo "Sai tài khoản hoặc mật khẩu!";
}
?>