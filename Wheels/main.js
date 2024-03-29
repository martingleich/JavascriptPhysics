// @ts-check

const TAU = Math.PI * 2;

/**
 * @typedef {{x:number, y:number}} Point
 * @typedef {{a:number, r:number}} PolarPoint
 */

/**
 * @typedef {(x:number) => number} ground_func
 * @typedef {(x:number) => number} wheel_rotation_func
 * @typedef {(alpha:number) => number} wheel_radius_func
 */

/**
 * @param {number} axle_y
 * @param {wheel_radius_func} wheel_radius
 * @param {number} start_x
 * @param {number} end_x
 * @param {number} step_x
 * @return {{ground:ground_func, wheel_rotation:wheel_rotation_func}}
 */
function convert_wheel_to_ground(axle_y, wheel_radius, start_x, end_x, step_x) {
	// Coupling equations:
	// d(alpha)/d(x) = ground(x) - axle_y
	// y(x) = axle_y - wheel_radius(alpha(x))
	let alphas = [0];
	let ys = [axle_y - wheel_radius(TAU)];
	for(let i = 0; i < (end_x - start_x) / step_x; ++i)
	{
		const alpha_delta = step_x / (axle_y - ys[i]);
		alphas.push(alphas[i] + alpha_delta);
		ys.push(axle_y - wheel_radius(alphas[i]));
	}
	return {
		ground: function(x) { return ys[Math.floor((x - start_x) / step_x)]; },
		wheel_rotation: function(x) { return alphas[Math.floor((x - start_x) / step_x)]; }
	};
}

const Wheels = {
	/** @param {number} size
	 * @return {wheel_radius_func}
	 */
	square: function(size) {
			return function(alpha) {
				let sa = Math.sin(alpha);
				let ca = Math.cos(alpha);
				if(ca*ca >= 0.5) {
					return size*Math.sqrt(1 + (sa/ca)*(sa/ca));
				} else {
					return size*Math.sqrt(1 + (ca/sa)*(ca/sa));
				}
			};
	},
	/** @param {number} radius
	 * @return {wheel_radius_func}
	 */
	circle: function(radius) {
		return function(alpha) { return radius; };
	},
	/** @param {number} w
	 * @param {number} h
	 * @return {wheel_radius_func}
	 */
	rectangle: function(w, h) {
		return this.polygon_cartesian([
			{x:w, y:h},
			{x:-w, y:h},
			{x:-w, y:-h},
			{x:w, y:-h},
		]);
	},
	polygon_cartesian: 
	/**
	 * @param {Point[]} points
	 * @return {wheel_radius_func}
	 */
	function(points) {
		// convert to list of lines/each line = start_angle/start_distance + end_angle/end_distance
		const polar_points = points.map(function(p) {
			const {x, y} = p;
			const angle = ((Math.atan2(y, x) % TAU) + TAU) % TAU;
			return {
					alpha: angle,
					point: p,
			};
		});
		return this._polygon(polar_points);
	},
	polygon_polar: 
	/**
	 * @param {[PolarPoint]} points
	 * @return {wheel_radius_func}
	 */
	function(points) {
		// convert to list of lines/each line = start_angle/start_distance + end_angle/end_distance
		const polar_points = points.map(function(p) {
			const {a, r} = p;
			const angle = ((a % TAU) + TAU) % TAU;
			const point = {
				x: Math.sin(angle) * r,
				y: Math.cos(angle) * r,
			}
			return {
					alpha: angle,
					point: point,
			};
		});
		return this._polygon(polar_points);
	},
	_polygon: 
	/**
	 * @param {{alpha:number, point:Point}[]} polar_points
	 * @return {wheel_radius_func}
	 */
	function(polar_points) {
		polar_points.push({
			alpha: polar_points[0].alpha + TAU,
			point: polar_points[0].point
		});

		return function(alpha) {
			alpha = ((alpha % TAU) + TAU) % TAU;
			if(alpha < polar_points[0].alpha) {
				alpha += TAU;
			}
			
			for(let i = 0; i < polar_points.length - 1; ++i) {
				if(alpha >= polar_points[i].alpha && alpha < polar_points[i + 1].alpha) {
					const dx = polar_points[i+1].point.x - polar_points[i].point.x;
					const dy = polar_points[i+1].point.y - polar_points[i].point.y;
					if(Math.abs(dx) > Math.abs(dy)) {
						return (polar_points[i+1].point.y * dx - polar_points[i+1].point.x*dy) / (dx*Math.sin(alpha) - dy * Math.cos(alpha));
					} else {
						return (polar_points[i+1].point.x * dy - polar_points[i+1].point.y*dx) / (dy*Math.cos(alpha) - dx * Math.sin(alpha));
					}
				}
			}
			return 0.0;
		};
	},
	/**
	 * @param {number} outer_radius
	 * @param {number} inner_radius
	 * @param {number} num_teeth
	 * @return {wheel_radius_func}
	 */
	saw_tooth: function(outer_radius, inner_radius, num_teeth) {
		const tooth_angle = TAU / num_teeth;
		return function(alpha) {
			const t = (alpha % tooth_angle / tooth_angle);
			return t*inner_radius + (1-t)*outer_radius;
		};
	},
	/**
	 * @param {number} minor
	 * @param {number} major
	 * @return {wheel_radius_func}
	 */
	ellipse_focus: function(minor, major) {
		const e = Math.sqrt(1-(minor*minor)/(major*major));
		return function(alpha) {
			return major*(1-e*e) / (1 + e * Math.cos(alpha));
		};
	},
	/**
	 * @param {number} minor
	 * @param {number} major
	 * @return {wheel_radius_func}
	 */
	ellipse_center: function(minor, major) {
		const e = Math.sqrt(1-(minor*minor)/(major*major));
		return function(alpha) {
			return minor / Math.sqrt(1 - Math.pow((e * Math.cos(alpha)), 2));
		};
	}
};

/** @param {HTMLCanvasElement} canvas_element
*/
function create_application(canvas_element) {
	const offset_x = canvas_element.width / 2;
	const offset_y = canvas_element.height / 2;
	const scale = 20;
	const img_to_logical_x = function(x) { return (x - offset_x) / scale; };
	const logical_to_img_x = function(x) { return x * scale + offset_x; };
	const logical_to_img_y = function(y) { return y * -scale + offset_y; };
	const axle_y = 0;

	const end_logical_x = img_to_logical_x(canvas_element.width);
	const start_logical_x = img_to_logical_x(0);
	const wheel_time = 10 * 1000;
	const wheel_render_pieces = 500;

	const app = {
		start_logical_x: start_logical_x,
		end_logical_x: end_logical_x,
		/** @type {wheel_radius_func?}*/
		wheel_radius: null,
		/** @type {ground_func?}*/
		ground: null,
		/** @type {wheel_rotation_func?}*/
		wheel_rotation: null,
		/**
		 * @param {wheel_radius_func} wheel
		 */
		set_wheel: function(wheel) {
			this.wheel_radius = wheel;
			const {ground, wheel_rotation} = convert_wheel_to_ground(axle_y, wheel, start_logical_x, end_logical_x, 0.01);
			this.ground = ground;
			this.wheel_rotation = wheel_rotation;
		},

		/** @param {number} animation_time */
		render_single_frame: function(animation_time)
		{
			const ctx = canvas_element.getContext('2d');
			if(ctx == null || this.ground == null || this.wheel_rotation == null || this.wheel_radius == null)
				return;
			ctx.clearRect(0, 0, canvas_element.width, canvas_element.height);

			// Ground
			ctx.beginPath();
			let image_x = 0;
			ctx.moveTo(0, canvas_element.height);
			do {	
				let logical_x = img_to_logical_x(image_x);
				let logical_y =  this.ground(logical_x);
				let image_y = logical_to_img_y(logical_y);
				ctx.lineTo(image_x, image_y);
				image_x = image_x + 1;
			} while(image_x <= canvas_element.width)
			ctx.lineTo(canvas_element.width, canvas_element.height);
			ctx.lineTo(0, canvas_element.height);
			ctx.closePath();
			ctx.fillStyle = "green";
			ctx.fill();
			ctx.strokeStyle = "darkgreen";
			ctx.lineWidth = 3;
			ctx.stroke();

			const wheel_axle_img_y = logical_to_img_y(axle_y);

			// Wheel
			const wheel_axle_img_x = ((animation_time % wheel_time) / wheel_time) * canvas_element.width;
			const wheel_axle_logical_x = img_to_logical_x(wheel_axle_img_x);
			const wheel_rotation_now = this.wheel_rotation(wheel_axle_logical_x);
			ctx.beginPath();
			ctx.translate(wheel_axle_img_x, wheel_axle_img_y);
			ctx.rotate(wheel_rotation_now);
			for(let i = 0; i < wheel_render_pieces; ++i) {
				const angle = TAU * i / wheel_render_pieces;
				const radius = scale * this.wheel_radius(angle);
				if(i === 0)
					ctx.moveTo(radius * Math.sin(angle), radius * (Math.cos(angle)));
				else
					ctx.lineTo(radius * Math.sin(angle), radius * (Math.cos(angle)));
			}
			ctx.resetTransform();
			ctx.closePath();
			ctx.fillStyle = "red";
			ctx.fill();
			ctx.strokeStyle = "darkred";
			ctx.lineWidth = 3;
			ctx.stroke();

			// Axle line	
			ctx.beginPath()
			ctx.setLineDash([10, 10]);
			ctx.moveTo(0, wheel_axle_img_y);
			ctx.lineTo(canvas_element.width, wheel_axle_img_y);
			ctx.setLineDash([]);
			ctx.strokeStyle = "darkred";
			ctx.lineWidth = 3;
			ctx.stroke();

			ctx.ellipse(wheel_axle_img_x, wheel_axle_img_y, 5, 5, 0, 0, Math.PI * 2);
			ctx.fillStyle = "darkred";
			ctx.fill();
		},
	};
	
	return app;
}


/** @type {HTMLCanvasElement} */
// @ts-ignore
const canvas_element = document.getElementById("canvas");

const application = create_application(canvas_element);
application.set_wheel(Wheels.rectangle(1, 2));
window.requestAnimationFrame(create_animation_loop(application.render_single_frame.bind(application)));