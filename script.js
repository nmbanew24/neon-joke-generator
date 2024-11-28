// Clock functionality
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Update analog clock hands
    const secondDegrees = ((seconds / 60) * 360) + 90;
    const minuteDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) + 90;
    const hourDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) + 90;

    document.querySelector('.second-hand').style.transform = `rotate(${secondDegrees}deg)`;
    document.querySelector('.minute-hand').style.transform = `rotate(${minuteDegrees}deg)`;
    document.querySelector('.hour-hand').style.transform = `rotate(${hourDegrees}deg)`;

    // Update digital time
    const digitalTime = document.querySelector('.digital-time');
    digitalTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

setInterval(updateClock, 1000);
updateClock(); // Initial call

// Joke functionality
const jokeText = document.getElementById('joke-text');
const getJokeBtn = document.getElementById('get-joke-btn');
const speakJokeBtn = document.getElementById('speak-joke-btn');
const copyJokeBtn = document.getElementById('copy-joke-btn');

async function getJoke() {
    try {
        const response = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit');
        const data = await response.json();
        
        let joke = '';
        if (data.type === 'single') {
            joke = data.joke;
        } else {
            joke = `${data.setup}\n\n${data.delivery}`;
        }
        
        jokeText.textContent = joke;
        return joke;
    } catch (error) {
        console.error('Error fetching joke:', error);
        jokeText.textContent = 'Failed to fetch joke. Please try again!';
    }
}

// Speech synthesis setup
let speechSynthesis = window.speechSynthesis;
let speaking = false;

function speakJoke() {
    if (speaking) {
        speechSynthesis.cancel();
        speaking = false;
        return;
    }

    const joke = jokeText.textContent;
    if (joke && joke !== 'Click the button to get a joke!') {
        const utterance = new SpeechSynthesisUtterance(joke);
        utterance.onend = () => {
            speaking = false;
            speakJokeBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speak';
        };
        speaking = true;
        speakJokeBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Stop';
        speechSynthesis.speak(utterance);
    }
}

function copyJoke() {
    const joke = jokeText.textContent;
    if (joke && joke !== 'Click the button to get a joke!') {
        navigator.clipboard.writeText(joke).then(() => {
            const originalText = copyJokeBtn.innerHTML;
            copyJokeBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyJokeBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy joke:', err);
        });
    }
}

// Event listeners
getJokeBtn.addEventListener('click', getJoke);
speakJokeBtn.addEventListener('click', speakJoke);
copyJokeBtn.addEventListener('click', copyJoke);

// Initialize the first joke
getJoke();
