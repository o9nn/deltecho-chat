
####### Expanded from @PACKAGE_INIT@ by configure_package_config_file() #######
####### Any changes to this file will be overwritten by the next CMake run ####
####### The input file was AtomSpaceRocksConfig.cmake.in                            ########

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

include("/home/runner/work/opencog-basic/opencog-basic/install/lib/cmake/AtomSpaceRocks/AtomSpaceRocksTargets.cmake")

link_directories(
	"/home/runner/work/opencog-basic/opencog-basic/install/lib/opencog/"
)
set(ATOMSPACE_ROCKS_LIBRARIES
	persist-rocks
	persist-monospace
)

set(ATOMSPACE_ROCKS_DATA_DIR "/home/runner/work/opencog-basic/opencog-basic/install/share/opencog")
set(ATOMSPACE_ROCKS_INCLUDE_DIR "/home/runner/work/opencog-basic/opencog-basic/install/include/")
set(ATOMSPACE_ROCKS_VERSION "1.3.0")
set(ATOMSPACE_ROCKS_FOUND 1)
