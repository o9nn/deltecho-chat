
####### Expanded from @PACKAGE_INIT@ by configure_package_config_file() #######
####### Any changes to this file will be overwritten by the next CMake run ####
####### The input file was AtomSpaceConfig.cmake.in                            ########

get_filename_component(PACKAGE_PREFIX_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../" ABSOLUTE)

macro(set_and_check _var _file)
  set(${_var} "${_file}")
  if(NOT EXISTS "${_file}")
    message(FATAL_ERROR "File or directory ${_file} referenced by variable ${_var} does not exist !")
  endif()
endmacro()

macro(check_required_components _NAME)
  foreach(comp ${${_NAME}_FIND_COMPONENTS})
    if(NOT ${_NAME}_${comp}_FOUND)
      if(${_NAME}_FIND_REQUIRED_${comp})
        set(${_NAME}_FOUND FALSE)
      endif()
    endif()
  endforeach()
endmacro()

####################################################################################

include("/home/runner/work/opencog-basic/opencog-basic/install/lib/cmake/AtomSpace/AtomSpaceTargets.cmake")

# Execution depends on atomspace and atomspace depends on execution,
# but circular dependencies are forbidden by cmake, so dependancy
# on execution is omitted in atomspace at build time. It should be set
# here for proper linking.
set_property(TARGET execution
	APPEND PROPERTY INTERFACE_LINK_LIBRARIES
	atomspace
)

set_property(TARGET query-engine
	APPEND PROPERTY INTERFACE_LINK_LIBRARIES
	pattern
	atomspace
)

set_property(TARGET truthvalue
	APPEND PROPERTY INTERFACE_LINK_LIBRARIES
	execution
)

set_property(TARGET atom_types
	APPEND PROPERTY INTERFACE_LINK_LIBRARIES
	atombase
)

# These names are used in various projects e.g. opencog, as-moses, etc.
# XXX FIXME ... they probably should not be! It would be best if the all
# of the libs were specified i.e. LINK_LIBRARIES(${ATOMSPACE_LIBRARIES})
set(ATOMSPACE_LIBRARY atomspace)
set(ATOMSPACE_atombase_LIBRARY atombase)
set(ATOMSPACE_atomcore_LIBRARY atomcore)
set(ATOMSPACE_atomflow_LIBRARY atomflow)
set(ATOMSPACE_atomproto_LIBRARY value)
set(ATOMSPACE_atomspace_LIBRARY atomspace)
set(ATOMSPACE_atomtypes_LIBRARY atom_types)
set(ATOMSPACE_clearbox_LIBRARY clearbox)
set(ATOMSPACE_execution_LIBRARY execution)
set(ATOMSPACE_grounded_LIBRARY grounded)
set(ATOMSPACE_join_LIBRARY join)
set(ATOMSPACE_json_LIBRARY json)
set(ATOMSPACE_pattern_LIBRARY pattern)
set(ATOMSPACE_load_scm_LIBRARY load_scm)
set(ATOMSPACE_persist_LIBRARY persist)
set(ATOMSPACE_sexpr_LIBRARY sexpr)
set(ATOMSPACE_smob_LIBRARY smob)
set(ATOMSPACE_truthvalue_LIBRARY truthvalue)
set(ATOMSPACE_value_LIBRARY value)

# XXX why are these listed in reverse dependency order?
# Doesn't the linker care about this?
set(ATOMSPACE_LIBRARIES
	atom_types
	value
	atombase
	atomcore
	atomflow
	columnvec
	truthvalue
	clearbox
	join
	pattern
	query-engine
	execution
	grounded
	smob
	atomspace
)

# Python is optional
IF (HAVE_CYTHON)
	set(ATOMSPACE_PythonEval_LIBRARY PythonEval)
	SET(ATOMSPACE_LIBRARIES
	    executioncontext
	    ${ATOMSPACE_LIBRARIES}
	    ${ATOMSPACE_PythonEval_LIBRARY}
	)
ENDIF (HAVE_CYTHON)

set(ATOMSPACE_DATA_DIR "/home/runner/work/opencog-basic/opencog-basic/install/share/opencog")
set(ATOMSPACE_INCLUDE_DIR "/home/runner/work/opencog-basic/opencog-basic/install/include/")
set(ATOMSPACE_VERSION "5.0.4")
set(ATOMSPACE_FOUND 1)
