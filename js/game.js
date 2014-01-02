window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
    || function (callback) {
        window.setTimeout(callback, 1000 / 60); // 60 FPS
    };


var canvas;
var ctx;
var width,
    height;

var scaleX,
    scaleY;

// game state
var inGame;
var endGame;


// game settings
var gameLength = 60; // seconds
var gravity;
var showExplosionMilliseconds = 1500;

// in game properties
var score;
var remainingTime;
var reduceScoreForLostBomb;


// lists of drawable objects
var droppings;
var explosions;
var obstacles;

var player;


// loading...
var loading;
var clickEnabled = false;

// images
var imgExplosion;


function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width * scaleX, canvas.height * scaleY);
}



function Explosion(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    this.timeElapsed = 0;

    this.remove = function () {
        var i;
        for (i = 0; i < explosions.length; i += 1) {
            if (explosions[i] === this) {
                explosions.splice(i, 1);
                break;
            }
        }
    };

    this.draw = function (ctx, dt) {
        this.timeElapsed += dt;
        if (this.timeElapsed > showExplosionMilliseconds) {
            this.remove();
            return;
        }

        ctx.globalAlpha = 1 - this.timeElapsed / showExplosionMilliseconds;
        ctx.drawImage(imgExplosion, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.globalAlpha = 1;
    };
}


function Dropping(x, y) {
    this.x = x; // width / 2.0;
    this.y = y;
    this.v = 0;

    this.remove = function () {
        var i;
        for (i = 0; i < droppings.length; i += 1) {
            if (droppings[i] === this) {
                droppings.splice(i, 1);
                break;
            }
        }
    };

    this.draw = function (ctx, dt) {
        this.v += gravity;
        this.y += this.v * dt / 1000;

        if (this.y >= height) {
            explosions.push(new Explosion(this.x, height * 0.985));
            this.remove();
            score -= reduceScoreForLostBomb;
        }


        var removed = false;
        var i;
        for (i = 0; i < obstacles.length; i += 1) {
            if (this.x > obstacles[i].x
                    && this.x < obstacles[i].x + obstacles[i].width
                    && this.y > obstacles[i].y
                    && this.y < obstacles[i].y + obstacles[i].height) {
                this.remove();
                removed = true;
                obstacles[i].destroy();
            }
        }

        if (removed) {
            return;
        }


        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    };
}


function Obstacle(speed, scoreValue, yPosition, friendly) {
    this.x = width;
    this.y = yPosition;
    this.width = width * 0.09999;
    this.height = height * 0.03;
    this.speed = speed;
    this.scoreValue = scoreValue;
    this.friendly = friendly;

    this.destroy = function () {
        if (friendly) {
            score -= this.scoreValue * 2;
        } else {
            score += this.scoreValue;
        }

        explosions.push(new Explosion(this.x + this.width / 2, this.y + this.height / 2));

        this.remove();
    };

    this.remove = function () {
        var i;
        for (i = 0; i < obstacles.length; i += 1) {
            if (obstacles[i] === this) {
                obstacles.splice(i, 1);
                i -= 1;
            }
        }
    };

    this.draw = function (ctx, dt) {
        this.x -= this.speed * dt / 1000;

        if (this.friendly) {
            if (this.x + this.width < 0) {
                score += this.scoreValue;
                this.remove();
            }

            ctx.fillStyle = 'green';
        } else {
            if (this.x < 0) {
                score -= this.scoreValue * 2;

                explosions.push(new Explosion(5, this.y + this.height / 2));

                this.remove();
            }

            ctx.fillStyle = 'red';
        }
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.closePath();
        ctx.fill();
    };
}

function Player() {
    this.x = width / 2;
    this.y = height * 0.10;
    this.width = 15;
    this.height = 15;

    this.dropBomb = function () {
        droppings.push(new Dropping(this.x, this.y));
    };

    this.draw = function (ctx) {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.rect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.closePath();
        ctx.fill();
    };
}



var time;

function renderFrame() {
    if (inGame === false) {
        return;
    }

    var now = new Date().getTime();
    var dt = now - time; // delta time
    time = now;

    // clear canvas
    clearCanvas();

    // draw objects
    var i;
    for (i = 0; i < obstacles.length; i += 1) {
        obstacles[i].draw(ctx, dt);
    }

    for (i = 0; i < explosions.length; i += 1) {
        explosions[i].draw(ctx, dt);
    }

    for (i = 0; i < droppings.length; i += 1) {
        droppings[i].draw(ctx, dt);
    }

    player.draw(ctx, dt);



    // draw score
    ctx.fillStyle = 'black';
    ctx.font = "bold 16px Arial";
    ctx.fillText("Score: " + score, 5, 15);
    ctx.fillText("Time remaining: " + remainingTime + "s", width - 200, 15);

    window.requestAnimationFrame(renderFrame); // maybe move this to start of function (for slow browsers that don't support requestAnimationFrame?
}

function showMenu() {
    // clear canvas
    clearCanvas();

    // draw menu
    ctx.fillStyle = 'black';

    ctx.font = "bold 26px Arial";
    ctx.fillText("Bomb dropper", 115, 150);

    ctx.font = "bold 16px Arial";
    ctx.fillText("Don't let enemy near your base.", 15, height - 200);
    ctx.fillText("Don't destroy friendly units.", 15, height - 180);
    ctx.fillText("Don't waste bombs.", 15, height - 160);
    ctx.fillText("Click anywhere to start new game", 15, height - 100);

    ctx.font = "12px Arial";
    ctx.fillText("Made by Igor Lalic", 250, height - 20);
}

function showEndGameScore() {
    // clear score and remaining time
    ctx.clearRect(0, 0, canvas.width * scaleX, 50 * scaleY);

    // draw end of game score
    ctx.fillStyle = 'black';

    ctx.font = "bold 26px Arial";
    ctx.fillText("Game over", 125, 150);

    ctx.font = "bold 20px Arial";
    ctx.fillText("Your score: " + score, 125, 200);

    ctx.font = "bold 16px Arial";
    ctx.fillText("Click anywhere to continue", 15, height - 100);
}

function newRandomUnit() {
    var someSpeed = width * 0.10 * (0.5 + Math.random());
    var someScore = 10;

    var yPosition = Math.random() * (height * 0.70) + (height * 0.25);
    var friendly = Math.random() < 0.2;
    obstacles.push(new Obstacle(someSpeed, someScore, yPosition, friendly));
}

function newGame() {
    inGame = true;
    endGame = false;


    time = new Date().getTime();

    score = 0;
    reduceScoreForLostBomb = 1;

    remainingTime = gameLength;

    gravity = height * 0.02; // % of height per second

    // drawable objects initialization
    droppings = [];
    explosions = [];
    obstacles = [];
    player = new Player();


    newRandomUnit();

    var intervalID = window.setInterval(function () {
        remainingTime -= 1;
        if (remainingTime <= 0) {
            window.clearInterval(intervalID);

            inGame = false;
            endGame = true;
            showEndGameScore();

            return;
        }

        newRandomUnit();
    }, 1000);

    window.requestAnimationFrame(renderFrame);
}


function onImageLoaded() {
    loading -= 1;

    if (loading === 0) {
        clickEnabled = true;
        showMenu();
    }
}

function loadImages() {
    loading = 0;

    // explosion
    loading += 1;
    imgExplosion = new Image();
    imgExplosion.onload = onImageLoaded();
    imgExplosion.src = 'images/explosion.png';
}


function initialize() {
    "use strict";
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    width = 400;
    height = 500;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scaleX = width / canvas.width;
    scaleY = height / canvas.height;
    ctx.scale(1 / scaleX, 1 / scaleY);

    inGame = false;
    endGame = false;

    loadImages();
}




function clicked(event) {
    var x = event.clientX * scaleX;
//    var y = event.clientY * scaleY;

    if (clickEnabled === false) {
        return;
    }

    if (inGame) {
        player.x = x;
        player.dropBomb();
    } else if (endGame) {
        endGame = false;
        showMenu();
    } else {
        newGame();
    }
}





