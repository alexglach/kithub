Gradebook.controller("AssignmentShowCtrl", ["$scope", "course", "assignment", "GPAService", "close", "AssignmentService", "CurveService", "$rootScope", "students", "VisualService", function($scope, course, assignment, GPAService, close, AssignmentService, CurveService, $rootScope, students, VisualService) {

  $scope.assignment = assignment
  $scope.gpa = {}
  $scope.gpa.raw = GPAService.rawGPA(course, assignment)
  $scope.hasCurve = assignment.has_curve
  $scope.curve = {}
  $scope.editingTitle = false
  $scope.modifyingCurve = false
  $scope.assignmentTitle = assignment.title
  $scope.numStudents = course.students.length
  $scope.students = students;

  var _fillFlatRateEditInput = function() {
    var curve = {}
    angular.copy($scope.assignment.flat_curve, curve)
    $scope.curve.flatRate = curve.flat_rate
  }

  var _fillLinearCurveEditInputs = function() {
    var curve = {}
    angular.copy($scope.assignment.linear_curve, curve)
    $scope.curve.rawA = curve.rawA
    $scope.curve.rawB = curve.rawB
    $scope.curve.curvedA = curve.curvedA
    $scope.curve.curvedB = curve.curvedB
  }

  var _fillCurveEditInputs = function() {
    if ($scope.assignment.flat_curve) {
      _fillFlatRateEditInput()
    } else if ($scope.assignment.linear_curve) {
      _fillLinearCurveEditInputs()
    }
  }

  if ($scope.assignment.has_curve ) {
    console.log("assignment has curve!")
    _fillCurveEditInputs()
    $scope.gpa.real = GPAService.realGPA(course, $scope.assignment)
    $scope.curveApplied = true 
  } else {
    $scope.gpa.real = $scope.gpa.raw
    $scope.curveApplied = false
  }


  (function() {
    var _submissions = []
    _.each(course.students, function(student) {
      _.each(student.submissions, function(submission) {
        if (submission.assignment_id === assignment.id) {
          _submissions.push(submission)
        }
      })
    })
    $scope.numSubmissions = _submissions.length
    $scope.submissions = _submissions
  })()



  $scope.editAssignment = function(assignment) {
    AssignmentService.editAssignment(assignment)
    $rootScope.$broadcast('assignment.edit', assignment);
    
  }

  $scope.editTitle = function() {
    $scope.editingTitle = true
  }

  $scope.submitTitleEdits = function() {
    // // do stuff with Restangular, then:
      // $scope.assignmentTitle = response.title
      // angular.copy(response, $scope.assignment)
      $scope.editingTitle = false
  }

  $scope.cancelEditTitle = function() {
    $scope.editingTitle = false
    $scope.assignmentTitle = assignment.title
  }

  $scope.close = function(result) {
    close(result, 200)
  }

  $scope.addCurve = function() {
    $scope.modifyingCurve = true
    if ($scope.assignment.has_curve) {
      $scope.editingCurve = true
    } 
  }

  $scope.applyFlatCurve = function() {
    $scope.gpa.real = $scope.curve.flatRate + $scope.gpa.raw
    $scope.curveApplied = true
  }

  $scope.applyLinearCurve = function() {
    $scope.gpa.real = _simulateLinearCurve()
    $scope.curveApplied = true
  }

  $scope.resetCurve = function() {
    $scope.curveApplied = false
    $scope.gpa.real = $scope.gpa.raw
    $scope.curve.flatRate = 0
    $scope.curve.rawA = 0
    $scope.curve.rawB = 0
    $scope.curve.curvedA = 0
    $scope.curve.curvedB = 0
  }

  $scope.saveChanges = function() {
    if ($scope.curveApplied && $scope.curveType === "Flat") {
      _applyFlatCurve();
    } else if ($scope.curveApplied && $scope.curveType === "Linear") {
      _applyLinearCurve();
    } else if (!$scope.curveApplied && $scope.assignment.has_curve) {
      _removeCurve();
    } else if ($scope.editingCurve && $scope.assignment.flat_curve) {
      _editFlatCurve();
    } else if ($scope.editingCurve && $scope.assignment.linear_curve) {
      _editLinearCurve();
    }
    angular.element('body').removeClass('modal-open');
    angular.element(".modal-backdrop").remove();
    close();
  }


  // private 

  var _unchangedLinearCurveInputs = function() {
    return $scope.curve.rawA === $scope.assignment.linear_curve.rawA &&
           $scope.curve.rawB === $scope.assignment.linear_curve.rawB &&
           $scope.curve.curvedA === $scope.assignment.linear_curve.curvedA &&
           $scope.curve.curvedB === $scope.assignment.linear_curve.curvedB
  }

  var _editFlatCurve = function() {
    // do nothing if flatRate hasn't changed
    if ($scope.assignment.flat_curve.flat_rate === $scope.curve.flatRate) {
      return
    // if flatRate has changed to 0, remove the curve
    } else if ($scope.curve.flatRate === "0") {
      _removeCurve();
    // else, CurveService.editFlatCurve($scope.assignment)
    } else {
      CurveService.editFlatCurve($scope.assignment, $scope.curve.flatRate)
      .then(function(response) {
        console.log("response in controller")
        console.log(response)
        $scope.assignment.flat_curve = response
        assignment.flat_curve = response // ?
        $scope.assignment.updated_at = response.assignment.updated_at
        assignment.updated_at = response.assignment.updated_at
      })
    }
  }

  var _editLinearCurve = function() {
    // do nothing if inputs haven't changed
    if (_unchangedLinearCurveInputs()) {
      return
    } else {
      CurveService.editLinearCurve($scope.assignment, $scope.curve)
      .then(function(response) {
        console.log("response in controller")
        console.log(response)
        $scope.assignment.linear_curve = response
        assignment.linear_curve = response // ?
        $scope.assignment.updated_at = response.assignment.updated_at
        assignment.updated_at = response.assignment.updated_at
      })
    }
  }

  var _removeCurve = function() {
    CurveService.removeCurve($scope.assignment)
    .then(function(response) {
      console.log("response in controller")
      console.log(response)
      $scope.assignment.has_curve = false
      assignment.has_curve = false
      $scope.assignment.flat_curve = null
      assignment.flat_curve = null
      $scope.assignment.linear_curve = null
      assignment.linear_curve = null
      $scope.assignment.updated_at = response.assignment.updated_at
      assignment.updated_at = response.assignment.updated_at
    })
  }

  var _applyFlatCurve = function() {
    CurveService.applyFlatCurve($scope.curve.flatRate, assignment.id)
    .then(function(response) {
      console.log("response in controller")
      console.log(response)
      $scope.assignment.has_curve = true
      $scope.assignment.flat_curve = response
      // not sure which is necessary
      assignment.has_curve = true
      assignment.flat_curve = response
      $scope.assignment.updated_at = response.assignment.updated_at
      assignment.updated_at = response.assignment.updated_at
    })
  }

  var _applyLinearCurve = function() {
    CurveService.applyLinearCurve($scope.curve, assignment.id)
    .then(function(response) {
      console.log("response in controller")
      console.log(response)
      $scope.assignment.linear_curve = response
      $scope.assignment.has_curve = true
      // not sure if either above or below or both are necessary
      assignment.has_curve = true 
      assignment.linear_curve = response
      $scope.assignment.updated_at = response.assignment.updated_at
      assignment.updated_at = response.assignment.updated_at
    })
  }

  var _simulateLinearCurve = function() {
    var _simulatedAssignment = {}
    angular.copy($scope.assignment, _simulatedAssignment)
    _simulatedAssignment.linear_curve = $scope.curve
    return GPAService.realGPA(course, _simulatedAssignment)
  }

  var _linearFormula = function(input, rawPercent) {
    return input.curvedA + (((input.curvedB - input.curvedA)/(input.rawB - input.rawA)) * (rawPercent - input.rawA));
  }

  var _averageRealScore = function(submissions) {
    var total = 0;
    _.each(submissions, function(submission) {
      total += submission.real_score
    })
    return total / submissions.length
  }  

  $scope.opts = {
    scales: {
      yAxes: [
        {ticks: {
          beginAtZero: true,
          steps: 10,
          stepValue: 10,
          max: 100
        }}
      ]
    }
  }

  var _scores = VisualService.studentScores(students, assignment)
  $scope.scoreLabels = _.map(_scores, 'name');
  $scope.scoreData = [_.map(_scores, function(score){
    return score.percent.toFixed(2);
  })];

}])