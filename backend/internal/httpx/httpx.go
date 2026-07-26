// Package httpx contém helpers de resposta HTTP padronizados.
package httpx

import "github.com/gin-gonic/gin"

// Error responde com um envelope de erro consistente.
func Error(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": message})
}

// OK responde 200 com o payload.
func OK(c *gin.Context, payload any) {
	c.JSON(200, payload)
}
