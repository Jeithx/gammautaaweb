/* game.js */
/* 
   Gelişmiş Space Invaders (Beam Versiyonu):
   - Oyuncu, ekranın alt kısmında hareket eder ve ateş edebilir.
   - Düşmanlar grup halinde hareket eder, her 1 saniyede bir daha büyük düşman mermileri ateş eder.
   - Arada can blokları belirli aralıklarla ortaya çıkar; toplanırsa oyuncunun canı artar.
   - Oyuncunun canı 0 olduğunda Game Over, tüm düşmanlar öldüğünde ise You Win durumu gerçekleşir.
   - Her 50 puan farkında, oyuncunun gemisi özel bir “ışın” (beam) atar; beam yalnızca oyuncunun önündeki, belirlenen genişlikteki düşmanları imha eder.
   - Oyun aktifken buton "Yeniden Başlat" olarak görünür (kırmızı) ve tıklanırsa oyunu yeniden başlatır.
*/

function initGame() {
    if (window.gameInitialized) return;
    window.gameInitialized = true;
  
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'gameContainer',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      }
    };
  
    // Oyunu global olarak saklamak için:
    window.phaserGame = new Phaser.Game(config);
  
    // Değişken tanımlamaları
    let player;
    let cursors;
    let spaceKey;
    let bullets;
    let enemies;
    let enemyBullets;
    let healthBlocks;
    let enemyVelocity = 50; // Düşmanların yatay hızı
    let lastFired = 0;
    let score = 0;
    let scoreText;
    let playerHealth = 3;
    let healthText;
    let gameOver = false;
    let win = false;
  
    // Beam (ışın) ile ilgili değişkenler:
    let beamReady = false;
    let lastBeamScore = 0; // Son beam tetiklenme puanı
  
    // Zamanlanmış event referansları:
    let enemyShootTimer;
    let healthBlockTimer;
  
    function preload() {
      // Oyuncu gemisi resmi
      this.load.image('player', 'https://labs.phaser.io/assets/sprites/ship.png');
      // Düşman resmi
      this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/enemy-black1.png');
      
      // Oyuncu mermisi: Beyaz dikdörtgen (4x12)
      let graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, 4, 12);
      graphics.generateTexture('bullet', 4, 12);
      
      // Düşman mermisi: Daha büyük kırmızı dikdörtgen (8x20)
      let enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      enemyGraphics.fillStyle(0xff0000, 1);
      enemyGraphics.fillRect(0, 0, 8, 20);
      enemyGraphics.generateTexture('enemyBullet', 8, 20);
      
      // Can bloğu: Yeşil kare (20x20)
      let healthGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      healthGraphics.fillStyle(0x00ff00, 1);
      healthGraphics.fillRect(0, 0, 20, 20);
      healthGraphics.generateTexture('healthBlock', 20, 20);
    }
  
    function create() {
      // Arka plan rengi
      this.cameras.main.setBackgroundColor('#24252A');
      
      // Oyuncu gemisi: Ekranın alt merkezinde
      player = this.physics.add.sprite(400, 550, 'player');
      player.setCollideWorldBounds(true);
      
      // Grupların oluşturulması
      bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });
      enemyBullets = this.physics.add.group({ defaultKey: 'enemyBullet', maxSize: 30 });
      enemies = this.physics.add.group();
      healthBlocks = this.physics.add.group();
  
      // Düşmanları satır ve sütun halinde dizme (4 satır x 10 sütun)
      const rows = 4, cols = 10, offsetX = 80, offsetY = 50, spacingX = 60, spacingY = 50;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let enemyX = offsetX + col * spacingX;
          let enemyY = offsetY + row * spacingY;
          let enemy = enemies.create(enemyX, enemyY, 'enemy');
          enemy.setOrigin(0.5, 0.5);
          enemy.body.allowGravity = false;
        }
      }
      
      // Klavye girişleri
      cursors = this.input.keyboard.createCursorKeys();
      spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      
      // Çarpışma kontrolleri
      this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
      this.physics.add.overlap(player, enemyBullets, playerHit, null, this);
      this.physics.add.overlap(player, healthBlocks, collectHealth, null, this);
      
      // Skor ve sağlık metinleri
      scoreText = this.add.text(10, 10, 'Score: 0', { font: '20px Arial', fill: '#ffffff' });
      healthText = this.add.text(10, 40, 'Health: ' + playerHealth, { font: '20px Arial', fill: '#ffffff' });
      
      // Zamanlanmış event’ler: Düşman ateşi ve can bloğu spawnlanması
      enemyShootTimer = this.time.addEvent({
        delay: 500,
        callback: enemyShoot,
        callbackScope: this,
        loop: true
      });
      healthBlockTimer = this.time.addEvent({
        delay: 5000,
        callback: spawnHealthBlock,
        callbackScope: this,
        loop: true
      });
  
      // Oyun başladıktan sonra "Oyunu Başlat" butonunu "Yeniden Başlat" olarak güncelleyelim:
      let startBtn = document.getElementById("startGame");
      if(startBtn) {
        startBtn.innerText = "Yeniden Başlat";
        startBtn.className = "btn btn-danger mb-3";
        // Butona tıklandığında sayfa yeniden yüklensin (oyun resetlenir)
        startBtn.onclick = function(){
          window.location.reload();
        }
      }
    }
  
    function update(time, delta) {
      if (gameOver || win) {
        return; // Oyun bittiğinde update döngüsü durur.
      }
      
      // Oyuncu sağ-sol hareketi
      player.setVelocityX(0);
      if (cursors.left.isDown) {
        player.setVelocityX(-200);
      } else if (cursors.right.isDown) {
        player.setVelocityX(200);
      }
      
      // Ateş etme: Space tuşuna basıldığında
      if (Phaser.Input.Keyboard.JustDown(spaceKey) && time > lastFired) {
        if (beamReady) {
          fireBeam.call(this);
          beamReady = false;
        } else {
          let bullet = bullets.get();
          if (bullet) {
            bullet.enableBody(true, player.x, player.y - 20, true, true);
            bullet.setVelocityY(-300);
          }
        }
        lastFired = time + 300;
      }
      
      // Ekrandan çıkan oyuncu mermileri
      bullets.children.each(function(bullet) {
        if (bullet.active && bullet.y < 0) {
          bullet.disableBody(true, true);
        }
      }, this);
      
      // Ekrandan çıkan düşman mermileri
      enemyBullets.children.each(function(bullet) {
        if (bullet.active && bullet.y > config.height) {
          bullet.disableBody(true, true);
        }
      }, this);
      
      // Ekrandan çıkan can blokları
      healthBlocks.children.each(function(block) {
        if (block.active && block.y > config.height) {
          block.disableBody(true, true);
        }
      }, this);
      
      // Düşmanların hareketi: Yatay ilerleyip kenarlara çarptığında aşağı inme
      let reverse = false;
      enemies.children.each(function(enemy) {
        enemy.x += enemyVelocity * delta / 1000;
        if (enemy.x >= config.width - 20 || enemy.x <= 20) {
          reverse = true;
        }
      }, this);
      if (reverse) {
        enemyVelocity *= -1;
        enemies.children.each(function(enemy) {
          enemy.y += 10;
        }, this);
      }
      
      // Her 50 puan farkında beam hazır hale gelsin:
      if (score - lastBeamScore >= 100) {
        beamReady = true;
        lastBeamScore += 100;
      }
      
      // Eğer tüm düşmanlar yoksa oyunu kazan.
      if (enemies.countActive(true) === 0) {
        winGame.call(this);
      }
    }
  
    // --- Çarpışma ve Olay Fonksiyonları ---
    
    // Normal mermi düşmana çarptığında
    function hitEnemy(bullet, enemy) {
      bullet.disableBody(true, true);
      enemy.disableBody(true, true);
      score += 10;
      scoreText.setText('Score: ' + score);
    }
    
    // Düşman ateşi: Rastgele aktif düşmandan mermi ateşi
    function enemyShoot() {
      let livingEnemies = enemies.getChildren().filter(e => e.active);
      if (livingEnemies.length === 0) return;
      let shooter = Phaser.Utils.Array.GetRandom(livingEnemies);
      let bullet = enemyBullets.get();
      if (bullet) {
        bullet.enableBody(true, shooter.x, shooter.y + 20, true, true);
        bullet.setVelocityY(250);
      }
    }
    
    // Düşman mermisi oyuncuya çarptığında
    function playerHit(player, bullet) {
      bullet.disableBody(true, true);
      playerHealth -= 1;
      healthText.setText('Health: ' + playerHealth);
      if (playerHealth <= 0) {
        endGame.call(this);
      }
    }
    
    // Can bloğu toplanırsa
    function collectHealth(player, block) {
      block.disableBody(true, true);
      playerHealth += 1;
      healthText.setText('Health: ' + playerHealth);
    }
    
    // Rastgele konumda can bloğu oluşturma
    function spawnHealthBlock() {
      let x = Phaser.Math.Between(20, config.width - 20);
      let y = Phaser.Math.Between(50, 300);
      let block = healthBlocks.get(x, y, 'healthBlock');
      if (!block) {
        block = healthBlocks.create(x, y, 'healthBlock');
      } else {
        block.enableBody(true, x, y, true, true);
      }
      block.setVelocityY(50);
    }
    
    // Beam (ışın) atma fonksiyonu:
    // Beam, oyuncu gemisinin önündeki belirlenen genişlikte (örneğin 100px) ve oyuncudan yukarıda olan düşmanları imha eder.
    function fireBeam() {
      let beamWidth = 100; // Beam etki alanı genişliği
      let beam = this.add.rectangle(player.x, player.y - 300, beamWidth, 600, 0x00ffff);
      beam.setOrigin(0.5, 1);
      this.tweens.add({
        targets: beam,
        alpha: { from: 1, to: 0 },
        duration: 500,
        onComplete: function() {
          beam.destroy();
        }
      });
      enemies.children.each(function(enemy) {
        if (
          enemy.active &&
          enemy.x >= (player.x - beamWidth / 2) &&
          enemy.x <= (player.x + beamWidth / 2) &&
          enemy.y < player.y
        ) {
          enemy.disableBody(true, true);
          score += 10;
        }
      }, this);
      scoreText.setText('Score: ' + score);
    }
    
    // Game Over durumu
    function endGame() {
      gameOver = true;
      // Zamanlanmış event’leri durdur: Düşman ateşi ve can bloğu spawnları
      enemyShootTimer.remove(false);
      healthBlockTimer.remove(false);
      this.physics.pause();
      this.add.text(config.width / 2, config.height / 2, 'Game Over', { font: '40px Arial', fill: '#ff0000' }).setOrigin(0.5);
    }
    
    // Oyun kazanma durumu
    function winGame() {
      win = true;
      enemyShootTimer.remove(false);
      healthBlockTimer.remove(false);
      this.physics.pause();
      this.add.text(config.width / 2, config.height / 2, 'You Win!', { font: '40px Arial', fill: '#00ff00' }).setOrigin(0.5);
    }
  }
  