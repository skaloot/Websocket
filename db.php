<?php

class Database {

    private $db_host = "localhost";  
	private $db_user = "skaloot";  
	private $db_pass = "phpmysql";  
    private $db_name = "websocket";
	

	private $con = false; 
	private $result = array(); 
    private $myQuery = "";
    private $numResults = "";
	

	public function connect() {
		if(!$this->con){
			$myconn = @mysql_connect($this->db_host,$this->db_user,$this->db_pass);  
            if($myconn){
            	$seldb = @mysql_select_db($this->db_name,$myconn); 
                if($seldb){
                	$this->con = true;
                    return true;
                }else{
                	array_push($this->result,mysql_error()); 
                    return false;
                }  
            }else{
            	array_push($this->result,mysql_error());
                return false;
            }  
        }else{  
            return true;
        }  	
	}
	

    public function disconnect() {
    	if($this->con) {
    		if(@mysql_close()) {
    			$this->con = false;
				return true;
			} else {
				return false;
			}
		}
    }
	
	public function sql($sql) {
		$query = @mysql_query($sql);
        $this->myQuery = $sql;
		if($query) {
			if(mysql_affected_rows() > 0) {
				$this->numResults = mysql_num_rows($query);
                $this->result = array();
				for($i = 0; $i < $this->numResults; $i++) {
					$r = mysql_fetch_array($query);
					$key = array_keys($r);
					for($x = 0; $x < count($key); $x++) {
						if(!is_int($key[$x])) {
							if(mysql_num_rows($query) >= 1) {
								$this->result[$i][$key[$x]] = $r[$key[$x]];
							} else {
								$this->result = array();
							}
						}
					}
                    $this->result[$i] = (object) $this->result[$i];
				}
			}
		} else {
			array_push($this->result,mysql_error());
		}
        return $this;
	}
	

	public function select($table, $rows = '*', $join = null, $where = null, $order = null, $limit = null) {
		$q = 'SELECT '.$rows.' FROM '.$table;
		if($join != null){
			$q .= ' LEFT JOIN '.$join;
		}
        if($where != null){
        	$q .= ' WHERE '.$where;
		}
        if($order != null){
            $q .= ' ORDER BY '.$order;
		}
        if($limit != null){
            $q .= ' LIMIT '.$limit;
        }
        $this->myQuery = $q; 
        if($this->tableExists($table)) {
        	$query = @mysql_query($q);
			if($query) {
				$this->numResults = mysql_num_rows($query);
                $this->result = array();
				for($i = 0; $i < $this->numResults; $i++) {
					$r = mysql_fetch_array($query);
                	$key = array_keys($r);
                	for($x = 0; $x < count($key); $x++) {
                    	if(!is_int($key[$x])) {
                    		if(mysql_num_rows($query) >= 1) {
                                $this->result[$i][$key[$x]] = $r[$key[$x]];
							} else {
								$this->result = null;
							}
						}
					}
                    $this->result[$i] = (object) $this->result[$i];
				}
			} else {
				array_push($this->result,mysql_error());
			}
            return $this;
      	} else {
      		return false; 
    	}
    }


    public function insert_array($table,$key,$params=array()) {
        if($this->tableExists($table)) {
            $arr = array(array("Homepage","Homepage"),array("Homepage","Homepage"),array("Homepage","Homepage"));
            $data = [];
            foreach($params as $param) {
                $data[] = "'".implode("','", $param)."'";
            }
            $sql='INSERT INTO `'.$table.'` (`'.implode('`, `',$key).'`) VALUES (' . implode('), (', $data).')';
            $this->myQuery = $sql;
            if($ins = @mysql_query($sql)) {
                array_push($this->result,mysql_insert_id());
                return true; 
            } else {
                array_push($this->result,mysql_error());
                return false;
            }
        } else {
            return false; 
        }
    }

	
    public function insert($table,$params=array()) {
    	if($this->tableExists($table)){
    	 	$sql='INSERT INTO `'.$table.'` (`'.implode('`, `',array_keys($params)).'`) VALUES ("' . implode('", "', $params) . '")';
            $this->myQuery = $sql;
            if($ins = @mysql_query($sql)) {
            	array_push($this->result,mysql_insert_id());
                return true; 
            } else {
            	array_push($this->result,mysql_error());
                return false;
            }
        } else {
        	return false; 
        }
    }
	

    public function delete($table,$where = null) {
    	 if($this->tableExists($table)) {
    	 	if($where == null){
                $delete = 'DELETE '.$table;
            } else {
                $delete = 'DELETE FROM '.$table.' WHERE '.$where; 
            }
            if($del = @mysql_query($delete)){
            	array_push($this->result,mysql_affected_rows());
                $this->myQuery = $delete; 
                return true; 
            } else {
            	array_push($this->result,mysql_error());
               	return false; 
            }
        } else {
            return false;
        }
    }
	

    public function update($table,$params=array(),$where) {
    	if($this->tableExists($table)) {
            $args=array();
			foreach($params as $field=>$value) {
				$args[]=$field.'="'.$value.'"';
			}
			$sql='UPDATE '.$table.' SET '.implode(',',$args).' WHERE '.$where;
            $this->myQuery = $sql;
            if($query = @mysql_query($sql)) {
            	array_push($this->result,mysql_affected_rows());
            	return true;
            } else {
            	array_push($this->result,mysql_error());
                return false; 
            }
        } else {
            return false; 
        }
    }
	

	private function tableExists($table) {
		$tablesInDb = @mysql_query('SHOW TABLES FROM '.$this->db_name.' LIKE "'.$table.'"');
        if($tablesInDb){
        	if(mysql_num_rows($tablesInDb)==1) {
                return true;
            } else {
            	array_push($this->result,$table." does not exist in this database");
                return false; 
            }
        }
    }
	

    public function getResult() {
        $val = $this->result;
        $this->result = array();
        return $val;
    }

    public function clear() {
        $this->result = array();
    }

    public function getSql() {
        $val = $this->myQuery;
        $this->myQuery = array();
        return $val;
    }

    public function numRows() {
        $val = $this->numResults;
        $this->numResults = array();
        return $val;
    }

    public function escapeString($data) {
        return mysql_real_escape_string($data);
    }
} 




// $db = new Database();
// $db->connect();
// $db->select('admin'); // Table name, Column Names, JOIN, WHERE conditions, ORDER BY conditions
// $res = $db->getResult();
// print_r($res);