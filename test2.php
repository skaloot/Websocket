<script>

var arr = [
	"skaloot",
	"etty",
	"tatiana",
	"eloot"
];


for(var i=0, len=arr.length; i<len; i++) {
	// console.log(arr[i]);
	if(i==1){
		arr.splice(i,1);
	}
	console.log(arr[i]);
}

for(var i=0;i<arr.length; i++) {
	console.log(arr[i]);
	if(i==1){
		// arr.splice(i,1);
	}
}

</script>