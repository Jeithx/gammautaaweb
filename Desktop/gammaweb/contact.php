<?php
// Formun POST yöntemiyle gönderilip gönderilmediğini kontrol ediyoruz.
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    
    // Form alanlarını almak ve temizlemek (basic sanitization)
    $name    = strip_tags(trim($_POST["name"]));
    $subject = strip_tags(trim($_POST["subject"]));
    $message = trim($_POST["message"]);

    // Zorunlu alanların dolu olup olmadığını kontrol ediyoruz.
    if (empty($name) || empty($subject) || empty($message)) {
        echo "Lütfen formu eksiksiz doldurun.";
        exit;
    }

    // E-postanın gideceği adres (sizin e-posta adresiniz)
    $recipient = "jeithx@gmail.com"; 

    // E-posta içeriğini oluşturma
    $email_content  = "Ad: $name\n";
    $email_content .= "Konu: $subject\n\n";
    $email_content .= "Mesaj:\n$message\n";

    // Başlıkları (headers) ayarlama
    // Gönderen kısmına gerçek bir domain yazmanız önerilir
    // Aksi halde e-postalar SPAM'e düşebilir.
    $email_headers = "From: wotobo1836@kuandika.com";

    // Mail gönderme
    if (mail($recipient, $subject, $email_content, $email_headers)) {
        echo "Mesajınız başarıyla gönderildi.";
    } else {
        echo "Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.";
    }
} else {
    // Eğer form POST yöntemiyle gönderilmediyse, 403 (yasak) hatası veriyoruz.
    http_response_code(403);
    echo "Bu sayfaya direkt erişim yasak.";
}
?>
