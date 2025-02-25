/* script.js */
/* DOM yüklendiğinde çalışacak fonksiyonlar */
document.addEventListener("DOMContentLoaded", function() {
    // İletişim formu gönderim işlemi
    document.getElementById('contactForm').addEventListener('submit', function(e) {
      e.preventDefault();
      // Temel form doğrulaması
      let name = document.getElementById('name').value.trim();
      let email = document.getElementById('email').value.trim();
      let message = document.getElementById('message').value.trim();
      
      if(name === "" || email === "" || message === "") {
        alert("Lütfen tüm alanları doldurunuz.");
        return;
      }
      
      // Gerçek uygulamada AJAX ile sunucuya gönderilebilir.
      alert("Mesajınız gönderildi, teşekkür ederiz!");
      this.reset();
    });
  
    // "Oyunu Başlat" butonuna tıklama olayını dinleme
    document.getElementById('startGame').addEventListener('click', function() {
      document.getElementById('gameContainer').style.display = 'block';
      initGame();
    });
  });
  