<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

        <title>Javascript Loop Test (60K data)</title>
   	</head>

   	<body>

		<div>
			<h2>Javascript Loop Test (60K data)</h2>
			<button type="button" onclick="start_test()">Start Test</button>
			<br><br>
			<div id="result"></div>
		</div>



		<script type="text/javascript" src="//localhost/kpj/jquery-1.7.1.min.js"></script>
		<script type="text/javascript">


		function get_date(today) {
		    var today = new Date();
		    var y = today.getFullYear();
		    var m = today.getMonth()+1;
		    var d = today.getDate();
		    var h = today.getHours();
		    var mt = today.getMinutes();
		    var s = today.getSeconds();
		    var date = m + "-" + d + "-" + y + "-" + h + "-" + mt + "-" + s;
		    return date;
		}


		function DateDiff(time1, time2) {
		    var diffMS = time1 - time2;    
		    var diffS = Math.floor(diffMS / 1000);
		    var diffM = Math.floor(diffS / 60);
		    var diffH = Math.floor(diffM / 60);
		    var diffD = Math.floor(diffH / 24);
		    diffS = diffS - (diffM * 60);
		    diffM = diffM - (diffH * 60);
		    diffH = diffH - (diffD * 24);

		    if(diffMS > 9 && diffMS < 99) {
		    	diffMS = "0"+diffMS;
		    }
		    if(diffMS < 10) {
		    	diffMS = "00"+diffMS;
		    }

		    return diffH+":"+diffM+":"+diffS+":"+diffMS;
		}


		var start_test = function() {
			var start = new Date().getTime();
			$.getJSON("//localhost/port/api", function(data){
				var finish = new Date().getTime();
				$("#result").html(null);
				$("#result").append("Duration - "+DateDiff(finish, start));
				$("#result").append("<br><br>");
				start = new Date().getTime();
				init_1(start,data);
				init_2(start,data);
				init_3(start,data);
				init_4(start,data);
			});
		}


		var init_1 = function(start,arr) {
			for(var i=0, len=arr.length; i<len; i++) {
				if(i==arr.length-1) {
					var str1 = start;
					var finish = new Date().getTime();
					$("#result").append("For loop (length caching)");
					$("#result").append("<br>");
					$("#result").append("Duration - "+DateDiff(finish, start));
					$("#result").append("<br><br>");
				}
			}
		}

		var init_2 = function(start,arr) {
			for(var i=0; i<arr.length; i++) {
				if(i==arr.length-1) {
					var str1 = start;
					var finish = new Date().getTime();
					$("#result").append("For loop");
					$("#result").append("<br>");
					$("#result").append("Duration - "+DateDiff(finish, start));
					$("#result").append("<br><br>");
				}
			}
		}

		var init_3 = function(start,arr) {
			for(var i in arr) {
				if(i==arr.length-1) {
					var str1 = start;
					var finish = new Date().getTime();
					$("#result").append("For in loop");
					$("#result").append("<br>");
					$("#result").append("Duration - "+DateDiff(finish, start));
					$("#result").append("<br><br>");
				}
			}
		}

		var init_4 = function(n,arr) {
			start = new Date().getTime();
			arr.forEach(function(i, idx) {
				if(idx==arr.length-1) {
					var str1 = start;
					var finish = new Date().getTime();
					$("#result").append("ForEach loop");
					$("#result").append("<br>");
					$("#result").append("Duration - "+DateDiff(finish, start));
					$("#result").append("<br><br>");
				}
			});
		}

		</script>
	</body>
</html>
