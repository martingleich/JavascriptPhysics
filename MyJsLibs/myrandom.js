function xorshift32(seed)
{
	let x = seed;
	return function()
	{
		x ^= x << 13;
		x ^= x >> 17;
		x ^= x << 5;
		return x;
	}
}

function intDistribution(upper)
{
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

function boolDistribution(prob)
{
	const maxIntDistribution = intDistribution(2**20);
	return function(rnd) { return maxIntDistribution(rnd) < prob * 2**20; };
}