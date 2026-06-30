{
  description = "ik_llama.cpp — llama.cpp fork with MTP CUDA fixes for RTX 4060";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      
      ik-llama-cpp = pkgs.stdenv.mkDerivation {
        pname = "ik-llama-cpp-cuda";
        version = "unstable-2026-06-29";

        src = pkgs.fetchFromGitHub {
          owner = "ikawrakow";
          repo = "ik_llama.cpp";
          rev = "f74a6fb87b315b2c3154166e075360e15021a61d";
          hash = "sha256-9Kec1up3HX/QTksXYC3rbIdG3QQ+V4WBsasa9htun84=";
        };

        nativeBuildInputs = with pkgs; [ cmake pkg-config git ];
        buildInputs = with pkgs; [
          cudaPackages.cudatoolkit
          cudaPackages.cudnn
          cudaPackages.libcublas
        ];
        propagatedBuildInputs = [ pkgs.addDriverRunpath ];

        cmakeFlags = [
          "-DGGML_CUDA=ON"
          "-DGGML_NATIVE=ON"
          "-DCMAKE_BUILD_TYPE=Release"
          "-DLLAMA_CURL=OFF"
          "-DLLAMA_BUILD_TESTS=OFF"
          "-DLLAMA_BUILD_EXAMPLES=ON"
          "-DLLAMA_BUILD_SERVER=ON"
        ];

        prePatch = ''
          sed -i '1i#include <cstdint>' ggml/src/iqk/iqk_common.h
        '';

        preBuild = ''
          export NIX_ENFORCE_NO_NATIVE=0
          export NIX_CFLAGS_COMPILE="''${NIX_CFLAGS_COMPILE:-} -mavx2 -mfma -mbmi -mbmi2 -mpopcnt -mf16c"
        '';

        preConfigure = ''
          export CUDA_PATH="${pkgs.cudaPackages.cudatoolkit}"
        '';

        meta = with pkgs.lib; {
          description = "ik_llama.cpp — llama.cpp fork with MTP CUDA fixes";
          homepage = "https://github.com/ikawrakow/ik_llama.cpp";
          license = licenses.mit;
          platforms = platforms.linux;
          mainProgram = "llama-server";
        };
      };
    in
    {
      packages.${system}.default = ik-llama-cpp;
      packages.${system}.ik-llama-cpp = ik-llama-cpp;
      
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          pkgs.cmake
          pkgs.pkg-config
          pkgs.git
          pkgs.gcc
          pkgs.cudaPackages.cudatoolkit
          pkgs.cudaPackages.cudnn
          pkgs.cudaPackages.libcublas
        ];
        shellHook = ''
          export NIX_ENFORCE_NO_NATIVE=0
          echo "ik_llama.cpp dev shell — run 'nix build' to build"
        '';
      };
    };
}
