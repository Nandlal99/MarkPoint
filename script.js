'use strict';

// selecting element
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');

const closeForm = document.querySelector('.form_cross');
// const removeWorkoutBtn = document.querySelector('.workout_cross');

const inputType = document.querySelector('.form_input-type');
const inputDistance = document.querySelector('.form_input_distance');
const inputDuration = document.querySelector('.form_input_duration');
const inputCadence = document.querySelector('.form_input_cadence');
const inputElevation = document.querySelector('.form_input_elevation');

const btnSubmit = document.querySelector('.btn-submit');

class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;      // [lat,long]
        this.distance = distance;  // km
        this.duration = duration;  // min
    }

    _setDescription() {
        // prettier ignor
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/hr
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// const run1 = new Running([28, -10], 5, 70, 158);
// const cycling1 = new Cycling([28, -10], 6, 40, 180);
// console.log(run1, cycling1);

class App {

    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();

        // get data from local storage
        this._getLocalStorage();

        // attach event listener
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        closeForm.addEventListener('click', this._hideForm);

    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Could not get your location🚀');
            });
        }
    }


    _loadMap(pos) {
        // console.log(pos);
        const { longitude, latitude } = pos.coords;
        // console.log(longitude, latitude);

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, 13);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);


        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });

    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
    }

    _hideForm() {
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.classList.add('hidden');
    }

    _toggleElevationField() {
        inputElevation.closest('.form_row').classList.toggle('form_row-hidden');
        inputCadence.closest('.form_row').classList.toggle('form_row-hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent?.latlng;

        let workout;

        // if workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // check if data is valid
            if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have to be positive numbers!');
            }

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // if workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have to be positive numbers!');
            }

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Add new object to workout array
        this.#workouts.push(workout);
        // console.log(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);


        // Render workout on List
        this._renderWorkout(workout);

        // Hide form + clear the fields
        this._hideForm();

        // set workout to local storage
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 300,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴‍♂️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <div class='workout__firstTitle'>
                <h2 class="workout__title">${workout.description}</h2>
                <p class="workout_cross">×</p>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴‍♂️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">KM</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">MIN</span>
            </div>
        `;

        if (workout.type === 'running') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">MIN/KM</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">SPM</span>
                </div>
            </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">KM/H</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🚵</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">M</span>
                </div>
            </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);

        // document.querySelector('.workout_cross').addEventListener('click', this._deleteWorkout.bind(this));

    }

    _moveToPopup(e) {

        const clickType = e.target.className;
        const workoutsEl = e.target.closest('.workout');
        // console.log(workoutsEl);

        if (!workoutsEl) return;

        const workout = this.#workouts.find(
            work => work.id === workoutsEl.dataset.id
        );
        // console.log(workout);

        if (clickType === 'workout_cross') {
            this._deleteWorkout(workout);
        }
        else {
            this.#map.setView(workout.coords, 13, {
                animate: true,
                pan: {
                    duration: 1,
                }
            })
        }

    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    _deleteWorkout(workout) {

        // const workoutEl = e.target.closest('.workout');
        // console.log(workoutEl);

        // if (!workoutEl) return;

        // const workout = this.#workouts.find(
        //     work => work.id === workoutEl.dataset.id
        // );

        const index = this.#workouts.indexOf(workout);

        this.#workouts.splice(index, 1);

        this._setLocalStorage();

        window.location.reload();

        // document.querySelector('.workout').remove();
        // this._getLocalStorage();
    }

}

const app = new App();







