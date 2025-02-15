const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {  willReadFrequently: true  });

const vid = document.getElementById('vid');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

canvas.style.top = canvas.style.left = canvas.style.margin = 0;
canvas.style.position = 'absolute';

const particles = [];

const N = 4000;
const R = 200;

const diffuseRate = 0.05;

const width = canvas.width;
const height = canvas.height;

let stream = canvas.captureStream(60); // 60 fps for timelapse
let mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = handleDataAvailable;
mediaRecorder.onstop = exportVideo;

let chunks = [];

let currTime = new Date().getTime() / 1000 / 60;

function handleDataAvailable(event) {
    chunks.push(event.data);
}

function exportVideo() {
    let blob = new Blob(chunks, { 'type' : 'video/mp4' }); // other types are available such as 'video/webm' for instance, see the doc for more info
    chunks = []; // reset chunks
    var videoURL = URL.createObjectURL(blob);
    vid.src = videoURL;
    window.open(videoURL, '_blank').focus();
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 1;
        this.v = 1;
        this.vx = 0;
        this.vy = 0;

        let angle = Math.atan2(y - height/2, -x + width/2);
        this.heading = Math.random() * 2 * Math.PI;

        this.rSensor = {x: 0, y: 0};
        this.lSensor = {x: 0, y: 0};
        this.fSensor = {x: 0, y: 0};

        this.sensorAngle = Math.PI/4;
        this.sensorDist = 10;

        this.rotAngle = Math.PI/4;
    }

    updateSensorPos() {
        // modulus is just to wrap it around the screen
        this.rSensor.x = (this.x + this.sensorDist*Math.cos(this.heading + this.sensorAngle) + width) % width;
        this.rSensor.y = (this.y + this.sensorDist*Math.sin(this.heading + this.sensorAngle) + height) % height;

        this.fSensor.x = (this.x + this.sensorDist*Math.cos(this.heading) + width) % width;
        this.fSensor.y = (this.y + this.sensorDist*Math.sin(this.heading) + height) % height;

        this.lSensor.x = (this.x + this.sensorDist*Math.cos(this.heading - this.sensorAngle) + width) % width;
        this.lSensor.y = (this.y + this.sensorDist*Math.sin(this.heading - this.sensorAngle) + height) % height;
    }

    update() {
        this.vx = this.v * Math.cos(this.heading);
        this.vy = this.v * Math.sin(this.heading);

        // Using % Modulo expression to wrap around the canvas
        this.x = (this.x + this.vx + width) % width;
        this.y = (this.y + this.vy + height) % height;

        this.updateSensorPos(); // update sensors after moving

        let fx = Math.floor(this.fSensor.x);
        let fy = Math.floor(this.fSensor.y);

        let lx = Math.floor(this.lSensor.x);
        let ly = Math.floor(this.lSensor.y);

        let rx = Math.floor(this.rSensor.x);
        let ry = Math.floor(this.rSensor.y);

        let f = getPixelStrength(fx, fy).r;
        let l = getPixelStrength(lx, ly).r;
        let r = getPixelStrength(rx, ry).r;

        // Compare values of f, l, and r to determine movement 
        if (f > l && f > r) {
            this.heading += 0;
        }
        else if (f < l && f < r) {
            if (Math.random() < 0.5) {
                this.heading += this.rotAngle;
            }
            else {
                this.heading -= this.rotAngle;
            }
        }
        else if (l > r) {
            this.heading -= this.rotAngle;
        }
        else if (r > l) {
            this.heading += this.rotAngle;
        }
    }

    render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.closePath();
    }
}

function getPixelStrength(x, y) {
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;

    return {
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3]
    };
}

function start() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // circular start
    for (let i = 0; i < N; i++) {
        let x, y;
        while (true) {
            x = 2 * Math.random() * R - R;
            y = 2 * Math.random() * R - R;

            if (Math.hypot(x, y) > R) continue;
            break;
        }

        x += width/2;
        y += height/2;

        particles.push(new Particle(x, y));
    }

    // for (let i = 0; i < N; i++) {
    //     let x = Math.random() * width;
    //     let y = Math.random() * height;
    //     particles.push(new Particle(x, y));
    // }

    if (mediaRecorder.state !== 'recording') mediaRecorder.start(100);

    requestAnimationFrame(loop);
}

function loop() {
    // gray out the screen a lil bit first
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = `rgba(0, 0, 0, ${diffuseRate})`;
    ctx.fillRect(0, 0, width, height);
    ctx.filter = 'none';

    for (const p of particles) {
        p.render();
        p.update();
    }

    let time = new Date().getTime() / 1000 / 60;

    if (time - currTime > 30) mediaRecorder.stop();

    requestAnimationFrame(loop);
}

start();
