/**
 * @param {(animation_time:number) => void} render_frame
 * @return {FrameRequestCallback} A callback that can be passed to {@link window.requestAnimationFrame}
 */
export function create_animation_loop(render_frame) {
	let start = undefined;
	function render(timestamp)
	{
		if(start === undefined) {
			start = timestamp;
		}
		render_frame(timestamp - start);
		window.requestAnimationFrame(render);
	}
	return render;
}