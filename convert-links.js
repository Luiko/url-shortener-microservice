const hex = '0123456789abcdef';
module.exports = function () {
    return {
        toShort: function (link) {
            let n = link.split('').reduce((sum, val) => sum + val.charCodeAt(0), 0);
            return 'https://url-shortener0.herokuapp.com/' + toHex(n) + 
                toHex(Math.floor(Math.random() * 100 * n))
            ;
        },
        decToHex: toHex,
        hexToDec: toDec
    };
    function toHex(num) {
        let remainder = 0;
        let sum = '';
        while (num > 0) {
            remainder = num % 16;
            num = Math.floor(num / 16);
            sum = hex[remainder] + sum;
        }
        return sum;
    }
    function toDec(num) {
        let sum = 0;
        let zeros = 0;
        while (num.length) {
            let char = num[num.length - 1];
            let dec = hex.indexOf(char);
            sum += zeros? dec * Math.pow(16, zeros): dec;
            num = num.slice(0, num.length - 1);
            zeros++;
        }
        return sum;
    }
}();