/**
 * @typedef {() => number} random_generator*/

/**
 * @param {number} seed The seed value
 * @return {random_generator}
*/
function xorshift32(seed)
{
	let x = Number(seed);
	return function()
	{
		x ^= x << 13;
		x ^= x >> 17;
		x ^= x << 5;
		return x;
	}
}

/**
 * @param {number} upper The exclusive upper bound of the distribution
 * @returns {(random_generator) => number}
 */
function intDistribution(upper)
{
	upper = Number(upper);
	if(upper & -upper == upper)
	{
		return function (rnd) { return (upper * (rnd()&0x7FFFFFFF)) >> 31; };
	}
	else
	{
		return function (rnd)
		{
			let val;
			let bits;
			do
			{
				bits = rnd() & 0x7FFFFFFF;
				val = bits % upper;
			} while(bits - val + (upper - 1) < 0);
			return val;
		};
	}
}
/**
 * @param {number} probability The probability for true
 * @returns {(random_generator) => number}
 */
function boolDistribution(probability)
{
	const maxIntDistribution = intDistribution(2**20);
	return function(rnd) { return maxIntDistribution(rnd) < probability * 2**20; };
}

function uniformDistribution(array)
{
	if(array.length === 1)
		return function(rnd) { return array[0]; };
	return function(rnd) { return array[intDistribution(array.length)(rnd)];};
}